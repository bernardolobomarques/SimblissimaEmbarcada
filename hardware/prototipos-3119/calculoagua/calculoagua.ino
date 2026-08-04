/*
 * Código de Cálculo de Volume Correto por Interpolação
 * ATUALIZADO para o NOVO RECIPIENTE (dados de 06/Nov)
 */

// --- Pinos ---
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

const float VELOCIDADE_SOM_CM_US = 0.0343;

// --- Tabela de Calibração (Baseada nos seus NOVOS dados) ---

// Quantidade de pontos de dados (11 pontos)
const int PONTOS_CALIBRACAO = 11;

// Array com as leituras de distância (em cm)
// IMPORTANTE: Em ordem decrescente (de vazio para cheio)
// Valores com vírgula (ex: 11,27) são escritos com ponto (ex: 11.27)
const float distancias_cm[PONTOS_CALIBRACAO] = {
  11.27, 10.68, 9.5, 9.21, 8.32, 8.03, 7.44, 6.26, 5.97, 5.37, 3.89
};

// Array com os volumes (em mL) correspondentes
const long volumes_ml[PONTOS_CALIBRACAO] = {
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
};
// -----------------------------------------------------------


void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // 1. Faz a leitura da distância com casas decimais
  float distanciaLida = lerDistanciaCm();

  if (distanciaLida > 0) {
    // 2. Converte a distância para Volume usando nossa tabela
    long volumeCalculado = interpolarVolume(distanciaLida);

    // 3. Exibe os resultados
    Serial.print("Distância: ");
    Serial.print(distanciaLida, 2); // 2 casas decimais
    Serial.print(" cm  |  Volume: ");
    Serial.print(volumeCalculado);
    Serial.println(" mL");
  } else {
    Serial.println("Erro na leitura do sensor!");
  }

  // Aguarda um tempo antes da próxima leitura
  delay(500);
}

/**
 * Função para ler o sensor e retornar a distância em CM com precisão
 */
float lerDistanciaCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);

  if (duration == 0) {
    return -1.0; // Retorna -1 para indicar um erro
  }
  
  float distanceCm = (duration * VELOCIDADE_SOM_CM_US) / 2.0;
  return distanceCm;
}


/**
 * Função de Interpolação Linear (Look-up Table)
 * Esta é a função que "calcula corretamente" o volume.
 * Converte a distância (cm) em volume (mL) usando as tabelas.
 */
long interpolarVolume(float distCm) {
  
  // --- Tratamento dos Limites (Zonas Mortas) ---
  
  // 1. Se a leitura for MAIOR ou IGUAL ao ponto 'vazio' (11.27),
  //    retorna 0 mL (o mínimo da tabela).
  if (distCm >= distancias_cm[0]) { 
    return volumes_ml[0]; // 0 mL
  }

  // 2. Se a leitura for MENOR ou IGUAL ao último ponto 'cheio' (3.89),
  //    retorna o volume máximo da tabela (1000 mL).
  int ultimo_ponto = PONTOS_CALIBRACAO - 1;
  if (distCm <= distancias_cm[ultimo_ponto]) {
    return volumes_ml[ultimo_ponto]; // 1000 mL
  }

  // --- Processo de Interpolação (Meio da Tabela) ---
  
  // 3. Procura em qual "segmento" a leitura está
  for (int i = 0; i < PONTOS_CALIBRACAO - 1; i++) {
    
    // Encontra o segmento correto:
    if (distCm <= distancias_cm[i] && distCm >= distancias_cm[i+1]) {
      
      // Encontramos o segmento!
      // Usa map() para fazer a "regra de três" nesse segmento.
      return map(distCm, 
                 distancias_cm[i],   
                 distancias_cm[i+1], 
                 volumes_ml[i],      
                 volumes_ml[i+1]     
                );
    }
  }

  // Se algo der muito errado (não deveria), retorna 0
  return 0; 
}