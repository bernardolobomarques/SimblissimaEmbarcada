/**
 * Tela de Configurações
 * Gerenciamento de perfil e configurações do app
 */

import React from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { List, Divider, Avatar } from 'react-native-paper'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'
import { COLORS } from '../../constants/colors'

export default function SettingsScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await authService.logout()
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user?.email?.charAt(0).toUpperCase() || 'U'}
          style={{ backgroundColor: COLORS.primary }}
        />
        <List.Item
          title={user?.email || 'Usuário'}
          titleStyle={styles.emailText}
        />
      </View>

      <List.Section>
        <List.Subheader>Conta</List.Subheader>
        <List.Item
          title="Perfil"
          description={user?.email}
          left={() => <List.Icon icon="account" />}
          right={() => <List.Icon icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Dispositivos"
          description="Gerenciar dispositivos IoT"
          left={() => <List.Icon icon="devices" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate('DeviceConfig' as never)}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Preferências</List.Subheader>
        <List.Item
          title="Tarifa de Energia"
          description="R$ 0,75 por kWh"
          left={() => <List.Icon icon="currency-brl" />}
          right={() => <List.Icon icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Notificações"
          description="Configurar alertas"
          left={() => <List.Icon icon="bell" />}
          right={() => <List.Icon icon="chevron-right" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Demonstração</List.Subheader>
        <List.Item
          title="Corrente demonstrativa"
          description="Ajustar valores exibidos na tela de energia"
          left={() => <List.Icon icon="flash" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate('DeviceConfig' as never)}
        />
        <Divider />
        <List.Item
          title="Reservatório de água"
          description="Configurar dimensões do tanque"
          left={() => <List.Icon icon="water" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate('WaterDeviceConfig' as never)}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Sobre</List.Subheader>
        <List.Item
          title="Versão"
          description="1.0.0"
          left={() => <List.Icon icon="information" />}
        />
        <Divider />
        <List.Item
          title="SBrT 2025 - IBMEC-RJ"
          description="Simpósio Brasileiro de Telecomunicações"
          left={() => <List.Icon icon="school" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Item
          title="Sair"
          left={() => <List.Icon icon="logout" color={COLORS.error} />}
          titleStyle={{ color: COLORS.error }}
          onPress={handleLogout}
        />
      </List.Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  emailText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
  },
})
