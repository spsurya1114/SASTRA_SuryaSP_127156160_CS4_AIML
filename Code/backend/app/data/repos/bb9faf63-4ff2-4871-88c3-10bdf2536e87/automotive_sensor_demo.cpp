/*
 * Automotive Sensor Demo — SecureCodeRAG test fixture
 *
 * This file intentionally contains common security defects so that a
 * static-analysis / SecureCodeRAG workflow has something to detect.
 * Do not copy these patterns into production code.
 */

#include <cstdlib>
#include <cstring>
#include <iostream>

struct Sensor {
    int id;
    int value;
};

// Finding candidate: pointer dereference without checking for nullptr.
int readSensorValue(Sensor* sensor) {
    return sensor->value;
}

// Finding candidate: unbounded copy into a fixed-size destination buffer.
void setSensorName(const char* input) {
    char sensorName[8];
    std::strcpy(sensorName, input);
    std::cout << "Sensor name: " << sensorName << '\n';
}

// Finding candidate: channel is not checked to be in the range [0, 3].
int readChannel(int channel) {
    int channels[4] = {10, 20, 30, 40};
    return channels[channel];
}

// Finding candidate: count may be zero.
int calculateAverage(int total, int count) {
    return total / count;
}

// Finding candidate: the multiplication can overflow a signed int.
int scaleReading(int reading) {
    return reading * 1000000;
}

// Finding candidate: allocated memory is not released before returning.
int readFirstSample(int value) {
    int* samples = static_cast<int*>(std::malloc(4 * sizeof(int)));
    if (samples == nullptr) {
        return -1;
    }

    samples[0] = value;
    return samples[0]; // Deliberate memory leak: samples is never freed.
}

int main() {
    // The vulnerable demonstration functions are not called here, so running
    // this program does not trigger the defects above.
    std::cout << "Automotive sensor source file for SecureCodeRAG analysis.\n";
    return 0;
}
