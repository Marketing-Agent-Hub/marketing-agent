# Monitoring UI - Quick Guide

## 📊 Tổng quan

Giao diện web monitoring đầy đủ để theo dõi và quản lý hệ thống backend. Bao gồm 5 tabs chính với auto-refresh và filtering.

## 🎯 Tính năng

### 1. Overview Tab 📈
**Auto-refresh: 30s**

Hiển thị tổng quan về:
- **System Health**: Trạng thái tổng thể và từng service (Database, OpenAI, Filesystem)
- **Logs Statistics (24h)**: Tổng số logs theo level (trace, debug, info, warn, error, fatal)
- **Metrics**: Tổng số metrics và recent count
- **Performance**: Average response time, total traces, slow requests count

**Cards màu sắc:**
- 🟢 UP (Green) - Service hoạt động bình thường
- 🟡 DEGRADED (Yellow) - Service hoạt động giảm
- 🔴 DOWN (Red) - Service ngừng hoạt động

### 2. Logs Tab 📝
**Auto-refresh: 10s**

**Filters:**
- Log level: ALL, trace, debug, info, warn, error, fatal
- Time range (tùy chỉnh)
- Trace ID (để filter logs của một request cụ thể)

**Hiển thị:**
- Table với 100 logs gần nhất
- Timestamp, level (màu khác nhau), message, trace ID
- Click "Metadata" để xem chi tiết JSON
- Log stats tổng hợp theo level

**Màu sắc log levels:**
- trace: Gray
- debug: Blue
- info: Green
- warn: Yellow
- error: Red
- fatal: Purple

### 3. Metrics Tab 📊
**Auto-refresh: 15s (system metrics: 5s)**

**System Metrics Cards:**
- Hiển thị real-time system metrics (CPU, memory, uptime, etc.)
- Auto-refresh mỗi 5 giây

**Metrics Table:**
- Filter by metric name
- Timestamp, name, value, unit, tags
- 100 metrics gần nhất

**Ví dụ metrics:**
- `http_requests_total`: Tổng số HTTP requests
- `http_request_duration_ms`: Response time
- `articles_processed`: Số articles đã xử lý
- `queue_size`: Kích thước queue

### 4. Health Tab 💚
**Auto-refresh: 10s (history: 30s)**

**Current Health Status:**
- Overall status badge (UP/DOWN/DEGRADED)
- Service cards với status, response time, last check time
- Services được monitor: database, openai, filesystem

**Health Check History:**
- Table hiển thị 50 health checks gần nhất
- Timestamp, service, status, response time, message
- Giúp track lịch sử downtime hoặc performance issues

### 5. Traces Tab ⚡
**Auto-refresh: 15s (slow traces: 30s)**

**Filters:**
- Trace name (filter by endpoint hoặc operation)
- Min duration (ms) - default: 1000ms
- Status: success/error

**Slow Requests Alert:**
- Banner màu vàng hiển thị top 5 slow requests (>5000ms)
- Giúp phát hiện performance bottlenecks

**Traces Table:**
- Timestamp, name, duration, status, trace ID
- Row highlighting:
  - 🟡 Yellow background: Duration > 5000ms (slow)
  - Red text: Duration > 5000ms
  - Yellow text: Duration > 1000ms
- Click trace ID để view details (future feature)

## 🚀 Cách sử dụng

### Truy cập
```
http://localhost:5173/monitoring
```

### Navigation
Từ bất kỳ page nào, click link **"Monitoring"** trong header.

### Auto-refresh
- Tất cả tabs đều tự động refresh
- Không cần manual refresh
- Có thể tạm dừng bằng cách switch sang tab khác (query disabled khi tab inactive)

### Filtering

**Logs:**
```typescript
// Filter by level
setLogLevel('error') // Chỉ hiển thị errors

// Search by trace ID
traceId: '123abc...' // Xem tất cả logs của một request
```

**Metrics:**
```typescript
// Search by name
metricName: 'http_requests' // Lọc metrics có tên chứa "http_requests"
```

**Traces:**
```typescript
// Filter slow requests
minDuration: 5000 // Chỉ hiển thị requests > 5s

// Search by name
traceName: 'GET /api/articles' // Lọc endpoint cụ thể
```

## 📈 Monitoring Best Practices

### 1. Daily Checks
- Check **Overview** tab mỗi sáng
- Xem health status
- Review error count (logs)
- Check slow requests count (traces)

### 2. Investigate Issues
Khi có vấn đề:
1. Vào **Overview** → Xem service nào DOWN/DEGRADED
2. Vào **Logs** → Filter by `error` level → Tìm root cause
3. Vào **Traces** → Filter slow requests → Tìm bottleneck
4. Vào **Health** → Xem history để biết khi nào issue bắt đầu

### 3. Performance Monitoring
- **Traces tab** để identify slow endpoints
- **Metrics tab** để track trends (request rate, processing time)
- **System Metrics** để monitor resource usage

### 4. Alerts Setup (Future)
Based on monitoring data:
- Error rate > threshold → Alert
- Response time > 5s → Alert  
- Health check failed → Alert
- Queue size > threshold → Alert

## 🎨 UI Components

### Color Schemes
- **Status badges**: Green (UP), Yellow (DEGRADED), Red (DOWN)
- **Log levels**: Gray, Blue, Green, Yellow, Red, Purple
- **Performance**: Green (<1s), Yellow (1-5s), Red (>5s)

### Layout
- Fixed header với navigation
- Tabs cho easy switching
- Cards và tables cho data display
- Auto-refresh indicators

## 🔗 API Endpoints Used

```typescript
// Overview
GET /api/monitor/overview

// Logs
GET /api/monitor/logs?level={level}&limit=100
GET /api/monitor/logs/stats

// Metrics
GET /api/monitor/metrics?name={name}&limit=100
GET /api/monitor/metrics/system

// Health
GET /api/monitor/health
GET /api/monitor/health/history?limit=50

// Traces
GET /api/monitor/traces?minDuration={ms}&limit=50
GET /api/monitor/traces/slow?threshold=5000
```

## 📊 Sample Queries

### Find errors in last hour
```
Logs tab → Filter: error → Result: All error logs
```

### Check slow API endpoints
```
Traces tab → Min Duration: 3000ms → Result: Requests >3s
```

### Monitor database health
```
Health tab → Find "database" service → Check status history
```

### Track metric trends
```
Metrics tab → Filter: "http_request_duration" → View values over time
```

## 🚧 Future Enhancements

- [ ] **Charts & Graphs**: Line charts cho metrics trends
- [ ] **Real-time WebSocket**: Live updates thay vì polling
- [ ] **Export Data**: Download logs/metrics as CSV/JSON
- [ ] **Custom Dashboards**: User-defined metric combinations
- [ ] **Alert Rules**: Configure alert thresholds in UI
- [ ] **Trace Details**: Click trace để view full span hierarchy
- [ ] **Log Search**: Full-text search trong logs
- [ ] **Date Range Picker**: Custom time range selection
- [ ] **Pagination**: Load more old data

## 💡 Tips

1. **Keep Overview tab open**: Để có quick glance về system health
2. **Use filters effectively**: Đừng load quá nhiều data, filter để focus
3. **Check slow traces**: Performance issues thường bắt đầu ở đây
4. **Monitor error logs**: Catch issues trước khi users report
5. **Track health history**: Understand outage patterns

## 📞 Troubleshooting

### "No data available"
- Check backend server đang chạy
- Verify authentication token còn valid
- Check browser console for API errors

### Data không update
- Check auto-refresh interval
- Switch tabs để trigger re-fetch
- Refresh browser page

### Slow UI
- Reduce auto-refresh intervals
- Increase min duration filter cho traces
- Limit số rows hiển thị

---

**Pro Tip**: Sử dụng Monitoring UI cùng với Prometheus/Grafana để có comprehensive monitoring solution! 🎯
