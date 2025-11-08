package health_records

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"example.com/project-sa/configs"
	"example.com/project-sa/entity"
)

type CreateHealthRecordPayload struct {
	HealthRecord   *entity.MedicalRecord  `json:"health_record"`
	VaccineRecords []entity.VaccineRecord `json:"vaccine_records"`
}

var acceptedLayouts = []string{
	time.RFC3339,
	"2006-01-02T15:04:05.000Z",
	"2006-01-02T15:04:05Z",
	"2006-01-02",
}

func parseFlexibleTime(s string) (time.Time, error) {
	for _, layout := range acceptedLayouts {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, nil // Return zero time and no error if parsing fails, can be adjusted
}

type vaccineRecordIn struct {
	ID          uint   `json:"ID"`
	VaccineID   uint   `json:"vaccine_id"`
	DoseNumber  int    `json:"dose_number"`
	LotNumber   string `json:"lot_number"`
	NextDueDate string `json:"next_due_date"`
}

type HealthRecordResponse struct {
	ID             uint                   `json:"ID"`
	DogID          uint                   `json:"dog_id"`
	StaffID        *uint                  `json:"staff_id"`
	Weight         float64                `json:"weight"`
	Temperature    float64                `json:"temperature"`
	Symptoms       string                 `json:"symptoms"`
	Diagnosis      string                 `json:"diagnosis"`
	Treatment      string                 `json:"treatment"`
	Medication     string                 `json:"medication"`
	Vaccination    string                 `json:"vaccination"`
	Notes          string                 `json:"notes"`
	DateRecord     string                 `json:"date_record"`
	VaccineRecords []entity.VaccineRecord `json:"vaccine_records,omitempty"`
}

func convertToResponse(record entity.MedicalRecord) HealthRecordResponse {
	var dateString string
	if !record.DateRecord.IsZero() {
		dateString = record.DateRecord.Format("2006-01-02T15:04:05.000Z")
	}

	var staffID *uint
	if record.StaffID != 0 {
		staffID = &record.StaffID
	}

	return HealthRecordResponse{
		ID:             record.ID,
		DogID:          record.DogID,
		StaffID:        staffID,
		Weight:         record.Weight,
		Temperature:    record.Temperature,
		Symptoms:       record.Symptoms,
		Diagnosis:      record.Diagnosis,
		Treatment:      record.TreatmentPlan,
		Medication:     record.Medication,
		Vaccination:    record.Vaccination,
		Notes:          record.Notes,
		DateRecord:     dateString,
		VaccineRecords: record.VaccineRecords,
	}
}

func GetHealthRecordById(c *gin.Context) {
	id := c.Param("id")
	var healthRecord entity.MedicalRecord
	if err := configs.DB().Preload("VaccineRecords").First(&healthRecord, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "health record not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": convertToResponse(healthRecord)})
}

func GetHealthRecordsByDogId(c *gin.Context) {
	dogID := c.Param("id")
	var healthRecords []entity.MedicalRecord
	if err := configs.DB().Preload("VaccineRecords").Where("dog_id = ?", dogID).Find(&healthRecords).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "health records not found for this dog"})
		return
	}

	var responses []HealthRecordResponse
	for _, record := range healthRecords {
		responses = append(responses, convertToResponse(record))
	}
	c.JSON(http.StatusOK, gin.H{"data": responses})
}

func CreateHealthRecord(c *gin.Context) {
	var payload CreateHealthRecordPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format: " + err.Error()})
		return
	}

	tx := configs.DB().Begin()
	healthRecord := payload.HealthRecord
	if err := tx.Create(healthRecord).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create health record: " + err.Error()})
		return
	}

	if len(payload.VaccineRecords) > 0 {
		for _, vr := range payload.VaccineRecords {
			vr.MedID = healthRecord.ID
			if err := tx.Create(&vr).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create vaccine record: " + err.Error()})
				return
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction commit failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Health record created successfully", "data": convertToResponse(*healthRecord)})
}

func DeleteHealthRecord(c *gin.Context) {
	id := c.Param("id")
	if err := configs.DB().Delete(&entity.MedicalRecord{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Health record deleted successfully"})
}

func UpdateHealthRecord(c *gin.Context) {
	id := c.Param("id")
	var updateData struct {
		DogID          uint              `json:"dog_id"`
		StaffID        *uint             `json:"staff_id"`
		Weight         float64           `json:"weight"`
		Temperature    float64           `json:"temperature"`
		Symptoms       string            `json:"symptoms"`
		Diagnosis      string            `json:"diagnosis"`
		Treatment      string            `json:"treatment"`
		Medication     string            `json:"medication"`
		Vaccination    string            `json:"vaccination"`
		Notes          string            `json:"notes"`
		DateRecord     string            `json:"date_record"`
		VaccineRecords []vaccineRecordIn `json:"vaccine_records"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingRecord entity.MedicalRecord
	if err := configs.DB().Preload("VaccineRecords").First(&existingRecord, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "health record not found"})
		return
	}

	tx := configs.DB().Begin()

	if updateData.DateRecord != "" {
		if t, err := parseFlexibleTime(updateData.DateRecord); err == nil {
			existingRecord.DateRecord = t
		}
	}

	if updateData.DogID != 0 {
		existingRecord.DogID = updateData.DogID
	}
	if updateData.StaffID != nil {
		existingRecord.StaffID = *updateData.StaffID
	}
	existingRecord.Weight = updateData.Weight
	existingRecord.Temperature = updateData.Temperature
	existingRecord.Symptoms = updateData.Symptoms
	existingRecord.Diagnosis = updateData.Diagnosis
	existingRecord.TreatmentPlan = updateData.Treatment
	existingRecord.Medication = updateData.Medication
	existingRecord.Notes = updateData.Notes
	existingRecord.Vaccination = updateData.Vaccination

	if err := tx.Save(&existingRecord).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update health record: " + err.Error()})
		return
	}

	if existingRecord.Vaccination == "YES" {
		incomingVaccineMap := make(map[uint]bool) // สร้างแมพเพื่อหาว่าไอดีมีอยู่ไหม
		for _, in := range updateData.VaccineRecords {
			if in.ID != 0 {
				incomingVaccineMap[in.ID] = true
			}
		}

		for _, existingVR := range existingRecord.VaccineRecords {
			if _, found := incomingVaccineMap[existingVR.ID]; !found {
				if err := tx.Delete(&existingVR).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete old vaccine record: " + err.Error()})
					return
				}
			}
		}

		for _, in := range updateData.VaccineRecords {
			nextDueDate, _ := parseFlexibleTime(in.NextDueDate)
			if in.ID != 0 {
				var vrToUpdate entity.VaccineRecord
				if tx.First(&vrToUpdate, in.ID).Error == nil {
					vrToUpdate.VaccineID = in.VaccineID
					vrToUpdate.DoseNumber = in.DoseNumber
					vrToUpdate.LotNumber = in.LotNumber
					vrToUpdate.NextDueDate = nextDueDate
					if err := tx.Save(&vrToUpdate).Error; err != nil {
						tx.Rollback()
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update vaccine record: " + err.Error()})
						return
					}
				}
			} else {
				newVR := entity.VaccineRecord{
					MedID: existingRecord.ID,
					VaccineID: in.VaccineID,
					DoseNumber: in.DoseNumber,
					LotNumber: in.LotNumber,
					NextDueDate: nextDueDate,
				}
				if err := tx.Create(&newVR).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new vaccine record: " + err.Error()})
					return
				}
			}
		}
	} else if existingRecord.Vaccination == "NO" {
		if err := tx.Where("med_id = ?", existingRecord.ID).Delete(&entity.VaccineRecord{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear vaccine records: " + err.Error()})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction commit failed: " + err.Error()})
		return
	}

	var updatedRecord entity.MedicalRecord
	configs.DB().Preload("VaccineRecords").First(&updatedRecord, id)
	c.JSON(http.StatusOK, gin.H{"message": "Health record updated successfully", "data": convertToResponse(updatedRecord)})
}