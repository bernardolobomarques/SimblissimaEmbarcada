/**
 * Tela de Registro
 * Permite criar nova conta de usuário
 */

import React, { useState } from 'react'
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { TextInput, Button, Title, Text } from 'react-native-paper'
import { authService } from '../../services/auth.service'
import { COLORS } from '../../constants/colors'
import { validateEmail, validatePassword, validateName } from '../../utils/validators'

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleRegister = async () => {
    // Validações
    if (!validateName(fullName)) {
      Alert.alert('Erro', 'Nome deve ter no mínimo 2 caracteres')
      return
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido')
      return
    }

    if (!validatePassword(password)) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const { user, error } = await authService.register({
        email,
        password,
        full_name: fullName,
      })
      
      if (error) {
        Alert.alert('Erro no registro', error.message || 'Não foi possível criar a conta')
      } else {
        Alert.alert(
          'Sucesso',
          'Conta criada com sucesso! Faça login para continuar.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        )
      }
    } catch (error: any) {
      Alert.alert('Erro no registro', error.message || 'Ocorreu um erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Title style={styles.title}>Criar Conta</Title>
          <Text style={styles.subtitle}>
            Preencha os dados para começar
          </Text>
          
          <TextInput
            label="Nome Completo"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
          />
          
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
          
          <TextInput
            label="Confirmar Senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock-check" />}
          />
          
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Criar Conta
          </Button>
          
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            Já tem conta? Fazer login
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 28,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
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
