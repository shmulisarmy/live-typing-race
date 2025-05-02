package utils

import (
	"time"
)

func SetInterval(callback func(), interval time.Duration) chan bool {
	stop := make(chan bool)

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				callback()
			case <-stop:
				return
			}
		}
	}()

	return stop
}
