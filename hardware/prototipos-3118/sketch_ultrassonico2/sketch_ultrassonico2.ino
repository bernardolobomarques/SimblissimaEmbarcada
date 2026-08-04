const int trigPin = 9;
const int echoPin = 10;
const int buzzerPin = 8;

long duration;
float distance;
int frequency;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH);
  distance = duration * 0.034 / 2;  // distância em cm

  // Mapeia a distância para frequência entre 100 e 2000 Hz
  // Limita distância entre 2cm e 200cm para evitar valores extremos
  if (distance < 2) distance = 2;
  if (distance > 40) distance = 200;
  frequency = map(distance, 2, 200, 2000, 100); // invertido para som diminuir com distância

  tone(buzzerPin, frequency);
  delay(50);
}
