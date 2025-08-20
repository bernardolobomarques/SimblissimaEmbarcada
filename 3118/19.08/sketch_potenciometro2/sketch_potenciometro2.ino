const int potPin = A0;
const int buzzerPin = 8;
int potValue = 0;
int frequency = 0;

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  potValue = analogRead(potPin);
  frequency = map(potValue, 0, 1023, 100, 2000);  
  tone(buzzerPin, frequency);
  delay(50);
}
