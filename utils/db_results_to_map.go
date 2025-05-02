package utils

import (
	"context"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
)

var temp_stmt_multiple_id_upto = 0

// ScanRowsToMapSlice runs a query and returns all rows as a slice of map[string]interface{}
func ScanRowsToMapSlice(ctx context.Context, conn *pgx.Conn, query string, args ...interface{}) ([]map[string]interface{}, error) {
	// Prepare a temporary statement to get metadata
	stmt, err := conn.Prepare(ctx, "temp_stmt_multiple"+strconv.Itoa(temp_stmt_multiple_id_upto), query)
	temp_stmt_multiple_id_upto++
	if err != nil {
		return nil, fmt.Errorf("prepare failed: %w", err)
	}

	// Execute the query
	rows, err := conn.Query(ctx, stmt.SQL, args...)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	// Prepare the results slice
	var results []map[string]interface{}

	for rows.Next() {
		// Create a slice for the row values
		values := make([]interface{}, len(stmt.Fields))
		for i := range values {
			var temp interface{}
			values[i] = &temp
		}

		// Scan the row
		if err := rows.Scan(values...); err != nil {
			return nil, fmt.Errorf("row scan failed: %w", err)
		}

		// Build the row map
		rowMap := make(map[string]interface{})
		for i, field := range stmt.Fields {
			rowMap[string(field.Name)] = *(values[i].(*interface{}))
		}

		results = append(results, rowMap)
	}

	// Check for iteration errors
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return results, nil
}

// ScanRowToMap runs a query and scans the first row into a map[string]interface{}
func ScanRowToMap(ctx context.Context, conn *pgx.Conn, query string, args ...interface{}) (map[string]interface{}, error) {
	// Prepare a temporary statement to get column metadata
	stmt, err := conn.Prepare(ctx, "temp_stmt_single"+strconv.Itoa(temp_stmt_multiple_id_upto), query)
	temp_stmt_multiple_id_upto++

	if err != nil {
		return nil, fmt.Errorf("prepare failed: %w", err)
	}

	// Run the query
	row := conn.QueryRow(ctx, stmt.SQL, args...)

	// Allocate space to hold the raw values
	values := make([]interface{}, len(stmt.Fields))
	for i := range values {
		var temp interface{}
		values[i] = &temp
	}

	// Scan the row
	if err := row.Scan(values...); err != nil {
		return nil, fmt.Errorf("scan failed: %w", err)
	}

	// Map the column names to the values
	result := make(map[string]interface{})
	for i, field := range stmt.Fields {
		result[string(field.Name)] = *(values[i].(*interface{}))
	}

	return result, nil
}
