package websocket

import (
	"log"
	"github.com/gin-gonic/gin"
)

func ServeWS(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Debug headers
		log.Printf("WS Upgrade Request Headers: %v", c.Request.Header)
		log.Printf("WS Connection Header: %s", c.Request.Header.Get("Connection"))
		log.Printf("WS Upgrade Header: %s", c.Request.Header.Get("Upgrade"))

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to set websocket upgrade: %+v", err)
			return
		}
		client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
		client.hub.register <- client

		// Allow collection of memory referenced by the caller by doing all work in
		// new goroutines.
		go client.writePump()
		go client.readPump()
	}
}
