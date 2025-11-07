import {
  calculateCylindricalCapacityLiters,
  calculateCylindricalVolumeFromHeight,
  calculateWaterLevel,
} from '../src/utils/calculations'

describe('water calculations', () => {
  it('computes cylindrical capacity in liters', () => {
    const capacity = calculateCylindricalCapacityLiters(50, 200)
    expect(capacity).toBeCloseTo(Math.PI * 50 * 50 * 200 / 1000, 5)
  })

  it('computes cylindrical volume from water height', () => {
    const volume = calculateCylindricalVolumeFromHeight(30, 120)
    expect(volume).toBeCloseTo(Math.PI * 30 * 30 * 120 / 1000, 5)
  })

  it('computes water level with sensor offset', () => {
    const level = calculateWaterLevel(40, 200, 5)
    // Expected water height = 200 - 5 - 40 = 155 -> 77.5%
    expect(level).toBeCloseTo(77.5, 2)
  })
})
