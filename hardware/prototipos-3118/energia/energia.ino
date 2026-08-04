// CÓDIGO FINAL CORRIGIDO (VREF 3.3V E SENSITIVITY CALIBRADA)

// Define o pino onde o sensor ACS712 está conectado
const int SENSOR_PIN = 34;

// ### CORREÇÃO PRINCIPAL AQUI ###
// Tensão de referência REAL do ADC do ESP32.
const float VREF = 3.3;

// Resolução do ADC do ESP32 (12 bits = 4096)
const int ADC_RESOLUTION = 4096;

// --- Parâmetros para Calibração ---
// Offset estável que você encontrou.
int ACS_OFFSET = 2947; 

// ### MUDANÇA PRINCIPAL AQUI ###
// Sensibilidade REAL, calculada a partir do seu teste e com VREF correto.
float SENSITIVITY = 0.0814;

void setup() {
  Serial.begin(115200);
  Serial.println("Iniciando medição - MODELO 30A - CALIBRAÇÃO FINAL");
  Serial.print("Usando Offset Fixo: ");
  Serial.println(ACS_OFFSET);
  Serial.print("Usando VREF: ");
  Serial.println(VREF, 1);
  Serial.print("Usando Sensibilidade CALIBRADA: ");
  Serial.println(SENSITIVITY, 4);
  delay(2000);
}

void loop() {
  float current_rms = getImprovedRMSCurrent();

  // Zona Morta (Dead Zone)
  if (current_rms < 0.15) {
    current_rms = 0.0;
  }

  Serial.print("Corrente RMS: ");
  Serial.print(current_rms, 3);
  Serial.println(" A");

  delay(1000);
}

float getImprovedRMSCurrent() {
  long sum_of_squares = 0;
  int sensorValue;
  int num_samples = 0;

  unsigned long startMillis = millis();
  while (millis() - startMillis < 500) {
    sensorValue = analogRead(SENSOR_PIN);
    long value_minus_offset = sensorValue - ACS_OFFSET;
    sum_of_squares += (value_minus_offset * value_minus_offset);
    num_samples++;
    delayMicroseconds(100);
  }

  float mean_square = (float)sum_of_squares / num_samples;
  float rms_adc = sqrt(mean_square);
  float rms_voltage = rms_adc * (VREF / ADC_RESOLUTION); // Agora usa VREF=3.3
  float current_rms = rms_voltage / SENSITIVITY;

  return current_rms;
}