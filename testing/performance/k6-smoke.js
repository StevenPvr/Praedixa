import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

// Auth-protected endpoints may return 401/403 in unauthenticated smoke runs.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    "health status < 500": (response) => response.status < 500,
  });

  const dashboard = http.get(`${BASE_URL}/api/v1/dashboard`);
  check(dashboard, {
    "dashboard status < 500": (response) => response.status < 500,
  });

  sleep(1);
}
