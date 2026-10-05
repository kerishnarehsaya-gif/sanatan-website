#!/data/data/com.termux/files/usr/bin/bash
# Website server chalu karne ke liye:  ./start.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8000

pkill -f "http.server $PORT" 2>/dev/null
sleep 1

cd "$DIR" || exit 1
setsid python3 -m http.server "$PORT" > "$DIR/server.log" 2>&1 < /dev/null &
disown
sleep 2

IP=$(ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -v '^127\.' | tail -1)

echo ""
echo "Website chalu hai:"
echo "  Phone par : http://localhost:$PORT"
[ -n "$IP" ] && echo "  WiFi par  : http://$IP:$PORT"
echo ""