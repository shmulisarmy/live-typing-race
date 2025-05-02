package db_live_sync

import (
	"context"
	"fmt"
	"live-typing-race/utils"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
)

var _db_conn *pgx.Conn

func Config(db_conn *pgx.Conn) {
	if db_conn == nil {
		panic("db_conn is nil")
	}
	_db_conn = db_conn
}

type LiveDbSync struct {
	Query             string
	Update_query      func(float64) string
	Rows              map[interface{}]map[string]interface{}
	Code_listeners    []func(map[string]interface{})
	Listeners         []*websocket.Conn
	Message_id_upto   int
	Last_update_check float64
}

func (store *LiveDbSync) Load_data() {
	store.Last_update_check = utils.Current_time()
	store.Rows = make(map[interface{}]map[string]interface{})
	rows, err := utils.ScanRowsToMapSlice(context.Background(), _db_conn, store.Query)
	if err != nil {
		panic(err)
	}
	for _, row := range rows {
		pk := row["id"]
		store.Rows[pk] = row
	}
	utils.SetInterval(store.update_data, 1*time.Second)
}

func (store *LiveDbSync) On_listener_join(conn *websocket.Conn) {
	fmt.Println("Listener joined")
	store.Listeners = append(store.Listeners, conn)
	// message_id_upto doesn't get updated, this user will start keeping track of message_id from this id and on (while users that are here from the begging will keep track all the way from 0 and so they know if their in sync with the server)
	message := map[string]interface{}{
		"type":            "store-join",
		"rows":            store.Rows,
		"length":          len(store.Rows),
		"message_id_upto": store.Message_id_upto,
	}
	fmt.Printf("Sending store-join: %v\n", message)
	conn.WriteJSON(message)
}

func (store *LiveDbSync) On_code_listener_join(code_listener func(map[string]interface{})) {
	store.Code_listeners = append(store.Code_listeners, code_listener)
}

func (store *LiveDbSync) Broadcast_json(message map[string]interface{}) {
	message["message_id_upto"] = store.Message_id_upto
	store.Message_id_upto++
	fmt.Printf("broadcast_json: %v\n", message)
	for i, conn := range store.Listeners {
		err := conn.WriteJSON(message)
		if err != nil {
			store.Listeners = append(store.Listeners[:i], store.Listeners[i+1:]...)
		}
	}
	for _, listener := range store.Code_listeners {
		listener(message)
	}

}

func (store *LiveDbSync) update_data() {
	fmt.Printf("calling update_data with last_update_check: %f\n", store.Last_update_check)
	rows, err := utils.ScanRowsToMapSlice(context.Background(), _db_conn, store.Update_query(store.Last_update_check))
	store.Last_update_check = utils.Current_time()
	if err != nil {
		panic(err)
	}
	for _, row := range rows {
		pk := row["id"]
		if _, ok := store.Rows[pk]; ok {
			store.Broadcast_json(map[string]interface{}{
				"type":   "row-updated",
				"row":    row,
				"id":     pk,
				"length": len(store.Rows),
			})
		} else {
			store.Broadcast_json(map[string]interface{}{
				"type":   "row-added",
				"row":    row,
				"id":     pk,
				"length": len(store.Rows),
			})
		}
		store.Rows[pk] = row
		fmt.Printf("row added: %v\n", row)

	}
}
