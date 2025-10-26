/**
 * Tela de Login
 * Permite usuário fazer login com email e senha
 */

import React, { useState } from 'react'
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { TextInput, Button, Title, Text } from 'react-native-paper'
import { authService } from '../../services/auth.service'
import { COLORS } from '../../constants/colors'
import { validateEmail, validatePassword } from '../../utils/validators'

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    // Validação
    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido')
      return
    }

    if (!validatePassword(password)) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const { user, error } = await authService.login({ email, password })
      
      if (error) {
        Alert.alert('Erro no login', error.message || 'Credenciais inválidas')
      }
      // Se login bem-sucedido, navegação será automática via useAuth
    } catch (error: any) {
      Alert.alert('Erro no login', error.message || 'Ocorreu um erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Title style={styles.title}>⚡ IoT Monitor</Title>
        <Text style={styles.subtitle}>
          Monitoramento de Energia e Água
        </Text>
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          mode="outlined"
          left={<TextInput.Icon icon="email" />}
        />
        
        <TextInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.input}
          mode="outlined"
          left={<TextInput.Icon icon="lock" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        
        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Entrar
        </Button>
        
        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
        >
          Não tem conta? Criar conta
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 32,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
})
