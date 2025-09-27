import prisma from '../src/lib/prisma'
import DeviceService from '../src/services/device.service'
import DeviceCommandService from '../src/services/deviceCommand.service'
import { DeviceType, DeviceStatus } from '../src/types'

async function testDeviceSystem() {
  console.log('🚀 Testing Device Registration & Management System...\n')

  try {
    // 1. Test Device Registration
    console.log('1. Testing device registration...')
    
    const testDevice = {
      name: 'Test RFID Reader 001',
      deviceId: 'RFID-TEST-001',
      secretKey: 'test-secret-key-12345678901234567890',
      deviceType: DeviceType.RFID_READER,
      firmwareVersion: '1.0.0',
      ipAddress: '192.168.1.100',
      macAddress: '00:11:22:33:44:55'
    }

    const registeredDevice = await DeviceService.register(testDevice)
    console.log('✅ Device registered successfully:', {
      id: registeredDevice.id,
      name: registeredDevice.name,
      deviceId: registeredDevice.deviceId,
      deviceType: registeredDevice.deviceType,
      status: registeredDevice.status
    })

    // 2. Test Device Authentication
    console.log('\n2. Testing device authentication...')
    
    const authenticatedDevice = await DeviceService.authenticate(testDevice.deviceId, testDevice.secretKey)
    if (authenticatedDevice) {
      console.log('✅ Device authentication successful')
    } else {
      console.log('❌ Device authentication failed')
    }

    // 3. Test Device Ping
    console.log('\n3. Testing device ping...')
    
    const pingData = {
      deviceId: testDevice.deviceId,
      batteryLevel: 85,
      signalStrength: -45,
      firmwareVersion: '1.0.1'
    }

    const pingedDevice = await DeviceService.ping(testDevice.deviceId, pingData)
    console.log('✅ Device ping successful:', {
      deviceId: pingedDevice.deviceId,
      isOnline: pingedDevice.isOnline,
      batteryLevel: pingedDevice.batteryLevel,
      signalStrength: pingedDevice.signalStrength,
      lastSeen: pingedDevice.lastSeen
    })

    // 4. Test Device Commands
    console.log('\n4. Testing device commands...')
    
    const command = await DeviceCommandService.sendCommand({
      deviceId: testDevice.deviceId,
      command: 'STATUS_CHECK',
      parameters: { requestId: 'test-001' }
    })

    console.log('✅ Command sent successfully:', {
      id: command.id,
      command: command.command,
      status: command.status
    })

    // 5. Test Get Pending Commands
    console.log('\n5. Testing get pending commands...')
    
    const pendingCommands = await DeviceCommandService.getPendingCommands(testDevice.deviceId)
    console.log('✅ Pending commands retrieved:', pendingCommands.length, 'commands')

    // 6. Test Device List
    console.log('\n6. Testing device list...')
    
    const deviceList = await DeviceService.list()
    console.log('✅ Device list retrieved:', deviceList.length, 'devices')

    // 7. Test Health Metrics
    console.log('\n7. Testing health metrics...')
    
    await DeviceService.recordHealthMetric(registeredDevice.id, 'battery_level', 85, 'percentage')
    await DeviceService.recordHealthMetric(registeredDevice.id, 'signal_strength', -45, 'dBm')
    
    const healthMetrics = await DeviceService.getHealthMetrics(registeredDevice.id)
    console.log('✅ Health metrics recorded and retrieved:', healthMetrics.length, 'metrics')

    // 8. Test Device Update
    console.log('\n8. Testing device update...')
    
    const updatedDevice = await DeviceService.update(registeredDevice.id, {
      name: 'Updated Test RFID Reader 001',
      status: DeviceStatus.MAINTENANCE
    })
    console.log('✅ Device updated successfully:', {
      name: updatedDevice.name,
      status: updatedDevice.status
    })

    // 9. Test Command Response
    console.log('\n9. Testing command response...')
    
    const commandResponse = await DeviceCommandService.updateCommandResponse(command.id, {
      commandId: command.id,
      success: true,
      response: { status: 'OK', deviceInfo: 'All systems operational' },
      executedAt: new Date()
    })
    console.log('✅ Command response updated:', {
      status: commandResponse.status,
      executedAt: commandResponse.executedAt
    })

    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await DeviceService.delete(registeredDevice.id)
    console.log('✅ Test device deleted')

    console.log('\n🎉 All device system tests passed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testDeviceSystem()
}