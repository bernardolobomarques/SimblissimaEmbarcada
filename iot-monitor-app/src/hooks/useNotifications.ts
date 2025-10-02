/**
 * Hook para notificações push
 * Gerencia permissões e configuração de notificações
 */

import { useEffect, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>()
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token)
      setHasPermission(!!token)
    })

    // Configurar handler de notificações
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  }, [])

  return {
    expoPushToken,
    hasPermission,
  }
}

async function registerForPushNotificationsAsync() {
  let token: string | undefined

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!')
    return
  }

  token = (await Notifications.getExpoPushTokenAsync()).data

  return token
}
