package utils

import (
	"time"
)

func Current_time() float64 {
	return float64(time.Now().UnixNano()) / 1e9
}
