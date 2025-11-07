import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Card, Chip, HelperText, Paragraph, Snackbar, TextInput, Title } from 'react-native-paper'
import { Formik, type FormikProps } from 'formik'
import * as yup from 'yup'
import { useAuth } from '../../hooks/useAuth'
import { deviceService, WaterTankConfigInput } from '../../services/device.service'
import { Device } from '../../types/device.types'
import { COLORS } from '../../constants/colors'
import { calculateCylindricalCapacityLiters } from '../../utils/calculations'

const formatDimension = (value: number) => (value >= 10 ? value.toFixed(1) : value.toFixed(2))

interface FormValues {
  height: string
  radius: string
  sensorOffset: string
}

const toNumber = (value: string, fallback: number = 0): number => {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.replace(',', '.').trim()
  if (!normalized) {
    return fallback
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

const validationSchema = yup.object({
  height: yup
    .number()
    .transform((_value, originalValue) => toNumber(originalValue, 0))
    .typeError('Informe um número válido')
    .min(10, 'Altura mínima de 10 cm')
    .max(1000, 'Altura máxima de 1000 cm')
    .required('Informe a altura do reservatório'),
  radius: yup
    .number()
    .transform((_value, originalValue) => toNumber(originalValue, 0))
    .typeError('Informe um número válido')
    .min(5, 'Raio mínimo de 5 cm')
    .max(500, 'Raio máximo de 500 cm')
    .required('Informe o raio do reservatório'),
  sensorOffset: yup
    .number()
    .transform((_value, originalValue) => toNumber(originalValue, 0))
    .typeError('Informe um número válido')
    .min(0, 'Offset não pode ser negativo')
    .max(100, 'Offset máximo de 100 cm')
    .default(0),
})

const defaultValues: FormValues = {
  height: '200',
  radius: '50',
  sensorOffset: '0',
}

export default function WaterDeviceConfigScreen() {
  const { user } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<FormValues>(defaultValues)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [usingEnergyFallback, setUsingEnergyFallback] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const loadDevices = async () => {
      setLoading(true)
      const { devices: fetchedDevices, usedFallback } = await deviceService.getWaterCapableDevices(user.id)
      setDevices(fetchedDevices)
      setUsingEnergyFallback(usedFallback)

      if (fetchedDevices.length > 0) {
        const firstDevice = fetchedDevices[0]
        setSelectedDeviceId(firstDevice.id)
        setInitialValues(extractFormValues(firstDevice))
      }

      setLoading(false)
    }

    loadDevices()
  }, [user?.id])

  useEffect(() => {
    if (!selectedDeviceId) {
      return
    }

    const selectedDevice = devices.find((device: Device) => device.id === selectedDeviceId)
    if (selectedDevice) {
      setInitialValues(extractFormValues(selectedDevice))
    }
  }, [selectedDeviceId, devices])

  const selectedDevice = useMemo(
    () => devices.find((device: Device) => device.id === selectedDeviceId) || null,
    [devices, selectedDeviceId]
  )

  const handleSave = async (values: FormValues) => {
    if (!selectedDeviceId) {
      setSnackbarMessage('Selecione um dispositivo para salvar as configurações.')
      setSnackbarVisible(true)
      return
    }

    setSaving(true)

    const payload: WaterTankConfigInput = {
      height_cm: toNumber(values.height, 0),
      radius_cm: toNumber(values.radius, 0),
      sensor_offset_cm: toNumber(values.sensorOffset, 0),
    }

    const updatedDevice = await deviceService.updateWaterTankConfig(selectedDeviceId, payload)

    if (updatedDevice) {
      setSnackbarMessage('Configurações do reservatório atualizadas com sucesso!')
      setDevices((prev: Device[]) =>
        prev.map((device: Device) =>
          device.id === updatedDevice.id ? { ...device, ...updatedDevice } : device
        )
      )
    } else {
      setSnackbarMessage('Não foi possível salvar as alterações. Tente novamente.')
    }

    setSaving(false)
    setSnackbarVisible(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.water} />
      </View>
    )
  }

  if (devices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Title>Nenhum dispositivo de água encontrado</Title>
            <Paragraph style={styles.emptyParagraph}>
              Cadastre um dispositivo de água no Supabase para configurar as dimensões do reservatório.
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    )
  }

  return (
    <>
      <Formik
        key={selectedDeviceId || 'default'}
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSave}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          isValid,
          dirty,
        }: FormikProps<FormValues>) => {
          const height = toNumber(values.height, 0)
          const radius = toNumber(values.radius, 0)
          const sensorOffset = toNumber(values.sensorOffset, 0)
          const capacityLiters = calculateCylindricalCapacityLiters(radius, height)

          return (
            <ScrollView contentContainerStyle={styles.container}>
              <Card style={styles.selectorCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Dispositivo monitorado</Title>
                  <Paragraph style={styles.sectionSubtitle}>
                    Escolha qual dispositivo utilizará esta configuração de reservatório.
                  </Paragraph>
                  {usingEnergyFallback && (
                    <Paragraph style={styles.fallbackNotice}>
                      Nenhum dispositivo de água foi encontrado. Usaremos o dispositivo de energia existente com o mesmo ID e API Key.
                    </Paragraph>
                  )}

                  <View style={styles.chipRow}>
                    {devices.map((device: Device) => {
                      const isSelected = device.id === selectedDeviceId
                      return (
                        <Chip
                          key={device.id}
                          icon={isSelected ? 'check' : 'water-outline'}
                          selected={isSelected}
                          selectedColor={COLORS.white}
                          style={[
                            styles.deviceChip,
                            isSelected && { backgroundColor: COLORS.water },
                          ]}
                          textStyle={isSelected ? styles.deviceChipTextSelected : styles.deviceChipText}
                          onPress={() => setSelectedDeviceId(device.id)}
                        >
                          {device.device_name || 'Reservatório'}
                        </Chip>
                      )
                    })}
                  </View>
                </Card.Content>
              </Card>

              <Card style={styles.formCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Dimensões do reservatório</Title>
                  <Paragraph style={styles.sectionSubtitle}>
                    Informe as dimensões internas para que o cálculo de volume seja preciso.
                  </Paragraph>

                  <TextInput
                    mode="outlined"
                    label="Altura total (cm)"
                    keyboardType="decimal-pad"
                    value={values.height}
                    onChangeText={handleChange('height')}
                    onBlur={handleBlur('height')}
                    style={styles.input}
                    placeholder="14.7"
                  />
                  <HelperText type="error" visible={!!(touched.height && errors.height)}>
                    {errors.height}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Raio interno (cm)"
                    keyboardType="decimal-pad"
                    value={values.radius}
                    onChangeText={handleChange('radius')}
                    onBlur={handleBlur('radius')}
                    style={styles.input}
                    placeholder="11"
                  />
                  <HelperText type="error" visible={!!(touched.radius && errors.radius)}>
                    {errors.radius}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Offset do sensor (cm)"
                    keyboardType="decimal-pad"
                    value={values.sensorOffset}
                    onChangeText={handleChange('sensorOffset')}
                    onBlur={handleBlur('sensorOffset')}
                    style={styles.input}
                    placeholder="0"
                  />
                  <HelperText type="error" visible={!!(touched.sensorOffset && errors.sensorOffset)}>
                    {errors.sensorOffset}
                  </HelperText>
                  <HelperText type="info" visible>
                    Offset é a distância entre o sensor e o topo da água. Se o sensor estiver alinhado ao topo do reservatório, deixe 0.
                  </HelperText>

                  <Button
                    mode="contained"
                    style={styles.saveButton}
                    onPress={() => handleSubmit()}
                    disabled={!isValid || !dirty || saving}
                    loading={saving}
                  >
                    Salvar configuração
                  </Button>
                </Card.Content>
              </Card>

              <Card style={styles.previewCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Pré-visualização</Title>
                  <Paragraph style={styles.sectionSubtitle}>
                    Capacidade estimada com base nos valores informados.
                  </Paragraph>

                  <View style={styles.previewRow}>
                    <View style={styles.previewStat}>
                      <Paragraph style={styles.previewLabel}>Altura</Paragraph>
                      <Title style={styles.previewValue}>{formatDimension(height)} cm</Title>
                    </View>
                    <View style={styles.previewStat}>
                      <Paragraph style={styles.previewLabel}>Raio</Paragraph>
                      <Title style={styles.previewValue}>{formatDimension(radius)} cm</Title>
                    </View>
                    <View style={styles.previewStat}>
                      <Paragraph style={styles.previewLabel}>Offset</Paragraph>
          <Title style={styles.previewValue}>{formatDimension(sensorOffset)} cm</Title>
                    </View>
                  </View>

                  <Paragraph style={styles.previewLabel}>Capacidade total estimada</Paragraph>
        <Title style={styles.previewHighlight}>{capacityLiters.toFixed(capacityLiters >= 10 ? 1 : 2)} L</Title>
                </Card.Content>
              </Card>
            </ScrollView>
          )
        }}
      </Formik>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  )
}

function extractFormValues(device: Device): FormValues {
  return {
    height: String(device.water_tank_height_cm ?? defaultValues.height),
    radius: String(device.water_tank_radius_cm ?? defaultValues.radius),
    sensorOffset: String(device.water_sensor_offset_cm ?? defaultValues.sensorOffset),
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  emptyCard: {
    borderRadius: 16,
  },
  emptyParagraph: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
  selectorCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  previewCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  fallbackNotice: {
    fontSize: 12,
    color: COLORS.warning,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  deviceChip: {
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginRight: 8,
    marginBottom: 8,
  },
  deviceChipText: {
    color: COLORS.textPrimary,
  },
  deviceChipTextSelected: {
    color: COLORS.white,
  },
  input: {
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewStat: {
    flex: 1,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.water,
  },
  previewHighlight: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.water,
    textAlign: 'center',
    marginTop: 8,
  },
})
