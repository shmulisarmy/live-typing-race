package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"live-typing-race/utils"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var sentence = `Though she* be but little, she is fierce.
Though though though* though though though
He gave* a thorough explanation of`

type Player struct {
	Name              string          `json:"name"`
	Correct_letter    int             `json:"correct_letter"`
	Incorrect_letter  int             `json:"incorrect_letter"`
	ws_connection     *websocket.Conn `json:"-"`
	Letter_index_upto int             `json:"letter_index_upto"`
	Wpm               int             `json:"wpm"`
	Color             string          `json:"color"`
}

var colors = []string{
	"red", "green", "blue", "yellow", "orange", "purple", "pink", "brown", "gray", "black", "white",
}
var time_of_game_start float64 = utils.Current_time()

func (player *Player) calculate_wpm() {
	elapsed := utils.Current_time() - time_of_game_start
	if elapsed > 0 {
		player.Wpm = int(float64(player.Correct_letter) / elapsed * 60)
	}
}

var power_ups_gotten = map[int]bool{}
var power_up = "*"

func init() {
	split_sentence := strings.Split(sentence, "")
	for i, letter := range split_sentence {
		if letter == power_up {
			power_ups_gotten[i] = false
		}
	}

}

func (player *Player) on_type_letter(letter string) {
	if letter == "ArrowLeft" || letter == "ArrowRight" || letter == "ArrowUp" || letter == "ArrowDown" || letter == "Shift" || letter == "Control" || letter == "Meta" || letter == "Alt" {
		return
	}
	if letter == "Backspace" {
		player.Letter_index_upto--
		if player.Letter_index_upto < 0 {
			player.Letter_index_upto = 0
		}
		goto Broadcast_section
	}
	if player.Letter_index_upto >= len(sentence) {
		return
	}
	if letter == string(sentence[player.Letter_index_upto]) {
		player.Correct_letter++
		next_index := player.Letter_index_upto + 1
		if power_up_gotten, ok := power_ups_gotten[next_index]; ok && !power_up_gotten {
			power_ups_gotten[next_index] = true
			before_jump := player.Letter_index_upto
			player.Letter_index_upto += 10
			broadcast_map(map[string]any{
				"type":  "power_up_gotten",
				"index": before_jump,
			})
			broadcast_map(map[string]any{
				"type": "player_jump",
				"from": before_jump,
				"to":   player.Letter_index_upto,
			})
			goto Broadcast_section
		}
	} else {
		player.Incorrect_letter++
	}
	player.Letter_index_upto++
Broadcast_section:
	broadcast_map(map[string]any{
		"type":   "player-typed",
		"player": player,
	})
}

var players = make(map[*websocket.Conn]*Player)

var clients = make([]*websocket.Conn, 0)

var name_upto = 0

var names = []string{
	"monk", "gilbert", "paul", "john", "jane",
	"jill", "jim", "joe", "jill2", "jim2",
}

func wsHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "WebSocket upgrade failed"})
		return
	}
	defer conn.Close()

	if name_upto >= len(names) {
		name_upto = 0
	}
	player := &Player{
		Name:              names[name_upto],
		Correct_letter:    0,
		Incorrect_letter:  0,
		ws_connection:     conn,
		Letter_index_upto: 0,
		Color:             colors[name_upto%len(colors)],
	}
	players[conn] = player
	name_upto++
	clients = append(clients, conn)

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			remove_client(conn)
			break
		}
		fmt.Printf("Received: %s\n", msg)
		player.on_type_letter(string(msg))
	}
}

func remove_client(conn *websocket.Conn) {
	delete(players, conn)
	for i, c := range clients {
		if c == conn {
			clients = append(clients[:i], clients[i+1:]...)
			break
		}
	}
}

func broadcast(message []byte) {
	fmt.Printf("broadcast: %v\n", message)
	for _, client := range clients {
		if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
			remove_client(client)
		}
	}
	fmt.Printf("finished broadcasting")
}

func broadcast_map[K comparable, V any](message map[K]V) {
	j, err := json.Marshal(message)
	if err != nil {
		panic(err)
	}
	broadcast(j)
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Add("Access-Control-Allow-Origin", "*")
		c.Next()
	})

	r.LoadHTMLGlob("frontend/dist/index.html")
	r.Static("/assets", "frontend/dist/assets")

	r.GET("/ping", func(c *gin.Context) {
		fmt.Println("this is the ping route")
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	r.GET("/", func(c *gin.Context) {
		c.File("frontend/dist/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	r.GET("/port", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"port": port})
	})

	r.GET("/new-route", func(c *gin.Context) {
		fmt.Println("new route")
		c.JSON(http.StatusOK, gin.H{"message": "new route"})
	})
	r.GET("/sentence", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"sentence": sentence})
	})

	r.GET("/ws", wsHandler)
	r.GET("/power_ups_gotten", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"power_ups_gotten": power_ups_gotten})
	})

	fmt.Println("Server running at http://localhost:" + port)

	// Broadcast player state every 2 seconds
	go func() {
		for {
			time.Sleep(2 * time.Second)
			converted := make(map[string]*Player)
			for _, player := range players {
				player.calculate_wpm()
				converted[player.Name] = player
			}

			broadcast_map(map[string]any{
				"type":    "players",
				"players": converted,
			})
		}
	}()

	if err := r.Run("0.0.0.0:" + port); err != nil {
		panic(err)
	}
}
