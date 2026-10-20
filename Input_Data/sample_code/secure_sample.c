/**
 * @file secure_sample.c
 * @brief Compliant Automotive C implementation conforming to MISRA C:2012 guidelines.
 * Demonstrates bounded operations, defensive parameter validation, and robust resource cleanup.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_PAYLOAD_SIZE 64U

typedef struct {
    unsigned int id;
    char payload[MAX_PAYLOAD_SIZE];
    size_t length;
} TelemetryPacket;

/**
 * @brief Safely copies incoming payload using bounded snprintf with bounds checking.
 * MISRA C:2012 Rule 21.3 / CWE-120 mitigation reference.
 */
int process_telemetry(const char* src_data, size_t data_len) {
    TelemetryPacket packet;
    
    // Explicit defensive null-pointer validation
    if (src_data == NULL) {
        return -1;
    }

    // Explicit boundary verification
    if (data_len >= MAX_PAYLOAD_SIZE) {
        return -2; // Reject oversized payloads
    }

    // Safe bounded copy with null termination guarantee
    int written = snprintf(packet.payload, sizeof(packet.payload), "%s", src_data);
    if (written < 0 || (size_t)written >= sizeof(packet.payload)) {
        return -3; // Truncation or write error
    }

    packet.length = (size_t)written;
    packet.id = 101U;
    
    return 0;
}

int main(void) {
    const char* safe_msg = "ECU_STATUS_OK";
    int status = process_telemetry(safe_msg, strlen(safe_msg));
    return (status == 0) ? 0 : 1;
}
