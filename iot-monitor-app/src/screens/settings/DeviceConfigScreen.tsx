/**
 * Tela de Configuração de Corrente Demonstrativa
 * Permite ajustar os parâmetros que serão exibidos no dashboard
 */

import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Card, Chip, HelperText, Paragraph, ProgressBar, Snackbar, TextInput, Title } from 'react-native-paper'
import { Formik, type FormikProps } from 'formik'
import * as yup from 'yup'
import { useAuth } from '../../hooks/useAuth'
import { deviceService } from '../../services/device.service'
import { Device } from '../../types/device.types'
import { COLORS } from '../../constants/colors'

interface FormValues {
  nominalCurrent: string
  maxCurrent: string
  nominalVoltage: string
  scenarioLabel: string
}

const validationSchema = yup.object({
  nominalCurrent: yup
    .number()
    .typeError('Informe um número válido')
    .min(0.1, 'Corrente deve ser maior que zero')
    .max(200, 'Valor acima do limite demonstrativo (200A)')
    .required('Informe a corrente nominal'),
  maxCurrent: yup
    .number()
    .typeError('Informe um número válido')
    .min(yup.ref('nominalCurrent'), 'Limite deve ser maior ou igual à corrente nominal')
    .max(300, 'Valor acima do limite demonstrativo (300A)')
    .required('Informe o limite seguro'),
  nominalVoltage: yup
    .number()
    .typeError('Informe um número válido')
    .min(80, 'Tensão mínima 80V')
    .max(260, 'Tensão máxima 260V')
    .required('Informe a tensão nominal'),
  scenarioLabel: yup
    .string()
    .max(40, 'Máximo de 40 caracteres')
    .required('Informe um título para a demonstração'),
})

const defaultValues: FormValues = {
  nominalCurrent: '15',
  maxCurrent: '20',
  nominalVoltage: '127',
  scenarioLabel: 'Residencial - Quadro Principal',
}

export default function DeviceConfigScreen() {
  const { user } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<FormValues>(defaultValues)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const loadDevices = async () => {
      setLoading(true)
      const fetchedDevices = await deviceService.getDevicesByType(user.id, 'energy')
      setDevices(fetchedDevices)

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

    const payload = {
      demo_nominal_current: Number(values.nominalCurrent),
      demo_max_current: Number(values.maxCurrent),
      demo_nominal_voltage: Number(values.nominalVoltage),
      demo_scenario_label: values.scenarioLabel,
      demo_last_updated: new Date().toISOString(),
    }

    const updatedDevice = await deviceService.updateDeviceMetadata(selectedDeviceId, payload)

    if (updatedDevice) {
      setSnackbarMessage('Configurações atualizadas com sucesso!')
      setSnackbarVisible(true)
      setDevices((prev: Device[]) =>
        prev.map((device: Device) =>
          device.id === updatedDevice.id ? { ...device, metadata: updatedDevice.metadata } : device
        )
      )
    } else {
      setSnackbarMessage('Não foi possível salvar as alterações. Tente novamente.')
      setSnackbarVisible(true)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (devices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Title>Nenhum dispositivo de energia encontrado</Title>
            <Paragraph style={styles.emptyParagraph}>
              Cadastre um dispositivo de energia no Supabase para configurar a demonstração da corrente.
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
          const nominalCurrent = Number(values.nominalCurrent) || 0
          const maxCurrent = Number(values.maxCurrent) || 1
          const nominalVoltage = Number(values.nominalVoltage) || 127
          const estimatedPower = nominalCurrent * nominalVoltage
          const utilization = Math.min(nominalCurrent / maxCurrent, 1)
          const safeMargin = Math.max(maxCurrent - nominalCurrent, 0)

          return (
            <ScrollView contentContainerStyle={styles.container}>
              <Card style={styles.selectorCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Dispositivo Monitorado</Title>
                  <Paragraph style={styles.sectionSubtitle}>
                    Escolha qual dispositivo de energia terá a corrente demonstrativa personalizada.
                  </Paragraph>

                  <View style={styles.chipRow}>
                    {devices.map((device: Device) => {
                      const isSelected = device.id === selectedDeviceId
                      return (
                        <Chip
                          key={device.id}
                          icon={isSelected ? 'check' : 'flash-outline'}
                          selected={isSelected}
                          selectedColor={COLORS.white}
                          style={[
                            styles.deviceChip,
                            isSelected && { backgroundColor: COLORS.secondary },
                          ]}
                          textStyle={isSelected ? styles.deviceChipTextSelected : styles.deviceChipText}
                          onPress={() => setSelectedDeviceId(device.id)}
                        >
                          {device.device_name || 'Dispositivo' }
                        </Chip>
                      )
                    })}
                  </View>
                </Card.Content>
              </Card>

              <Card style={styles.formCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Parâmetros Demonstrativos</Title>
                  <Paragraph style={styles.sectionSubtitle}>
                    Esses valores são utilizados apenas para simular cenários no aplicativo.
                  </Paragraph>

                  <TextInput
                    mode="outlined"
                    label="Corrente nominal (A)"
                    keyboardType="numeric"
                    value={values.nominalCurrent}
                    onChangeText={handleChange('nominalCurrent')}
                    onBlur={handleBlur('nominalCurrent')}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!(touched.nominalCurrent && errors.nominalCurrent)}>
                    {errors.nominalCurrent}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Limite seguro (A)"
                    keyboardType="numeric"
                    value={values.maxCurrent}
                    onChangeText={handleChange('maxCurrent')}
                    onBlur={handleBlur('maxCurrent')}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!(touched.maxCurrent && errors.maxCurrent)}>
                    {errors.maxCurrent}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Tensão nominal (V)"
                    keyboardType="numeric"
                    value={values.nominalVoltage}
                    onChangeText={handleChange('nominalVoltage')}
                    onBlur={handleBlur('nominalVoltage')}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!(touched.nominalVoltage && errors.nominalVoltage)}>
                    {errors.nominalVoltage}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Título da demonstração"
                    value={values.scenarioLabel}
                    onChangeText={handleChange('scenarioLabel')}
                    onBlur={handleBlur('scenarioLabel')}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!(touched.scenarioLabel && errors.scenarioLabel)}>
                    {errors.scenarioLabel}
                  </HelperText>

                  <Button
                    mode="contained"
                    style={styles.saveButton}
                    onPress={() => handleSubmit()}
                    disabled={!isValid || !dirty || saving}
                    loading={saving}
                  >
                    Salvar configurações
                  </Button>
                </Card.Content>
              </Card>

              <Card style={styles.previewCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Pré-visualização</Title>
                  <Paragraph style={styles.sectionSubtitle}>
                    Assim as informações irão aparecer nos dashboards.
                  </Paragraph>

                  <View style={styles.previewHeader}>
                    <View>
                      <Paragraph style={styles.previewLabel}>Cenário</Paragraph>
                      <Title style={styles.previewValue}>{values.scenarioLabel}</Title>
                    </View>
                    <Chip icon="flash" style={styles.previewChip}>Demonstração</Chip>
                  </View>

                  <View style={styles.previewRow}>
                    <View style={styles.previewStat}>
                      <Paragraph style={styles.previewLabel}>Corrente</Paragraph>
                      <Title style={styles.previewHighlight}>{nominalCurrent.toFixed(1)} A</Title>
                    </View>
                    <View style={styles.previewStat}>
                      <Paragraph style={styles.previewLabel}>Limite</Paragraph>
                      <Title style={styles.previewHighlight}>{maxCurrent.toFixed(1)} A</Title>
                    </View>
                    <View style={styles.previewStat}>
                      <Paragraph style={styles.previewLabel}>Potência estimada</Paragraph>
                      <Title style={styles.previewHighlight}>{estimatedPower.toFixed(0)} W</Title>
                    </View>
                  </View>

                  <Paragraph style={styles.previewLabel}>Utilização simulada</Paragraph>
                  <ProgressBar
                    progress={utilization}
                    color={utilization >= 0.85 ? COLORS.warning : COLORS.success}
                    style={styles.previewProgress}
                  />
                  <Paragraph style={styles.previewFooter}>
                    Margem de segurança: {safeMargin.toFixed(1)} A
                  </Paragraph>
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
  const metadata = device.metadata || {}

  return {
    nominalCurrent: String(metadata.demo_nominal_current ?? defaultValues.nominalCurrent),
    maxCurrent: String(metadata.demo_max_current ?? defaultValues.maxCurrent),
    nominalVoltage: String(metadata.demo_nominal_voltage ?? defaultValues.nominalVoltage),
    scenarioLabel: String(metadata.demo_scenario_label ?? defaultValues.scenarioLabel),
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
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewHighlight: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  previewChip: {
    backgroundColor: COLORS.secondary,
  },
  previewProgress: {
    height: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  previewFooter: {
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
})
