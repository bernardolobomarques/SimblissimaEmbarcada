const int led = 4;
const int unit = 200;

void dot() {
  digitalWrite(led, HIGH);
  delay(unit);
  digitalWrite(led, LOW);
  delay(unit);
}

void dash() {
  digitalWrite(led, HIGH);
  delay(3 * unit);
  digitalWrite(led, LOW);
  delay(unit);
}

void setup() {
  pinMode(led, OUTPUT);
}

//palavra embarcado
void loop() {
  // E: .
  dot();
  delay(2 * unit);
  
  // M: --
  dash();
  dash();
  delay(2 * unit);

  // B: -...
  dash();
  dot();
  dot();
  dot();
  delay(2 * unit);

  // A: .-
  dot();
  dash();
  delay(2 * unit);

  // R: .-.
  dot();
  dash();
  dot();
  delay(2 * unit);

  // C: -.-.
  dash();
  dot();
  dash();
  dot();
  delay(2 * unit);

  // A: .-
  dot();
  dash();
  delay(2 * unit);

  // D: -..
  dash();
  dot();
  dot();
  delay(2 * unit);

  // O: ---
  dash();
  dash();
  dash();
  delay(7 * unit);  
}
