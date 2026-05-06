package env

import (
	"os"
	"strconv"
)

func GetString(key string) string {
	return os.Getenv(key)
}

func GetInt(key string) int {
	val := os.Getenv(key)
	newVal, err := strconv.Atoi(val)
	if err != nil {
		return 0
	}

	return newVal
}
