import { cleanupTestData, createTestUser, createTestProjectCity } from '../helpers/testData'

describe('User Service Tests', () => {
  afterAll(async () => {
    await cleanupTestData()
  })

  describe('createTestUser', () => {
    it('should create a test user with default values', async () => {
      const user = await createTestUser()
      
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.username).toMatch(/testuser_\d+/)
      expect(user.firstName).toBe('Test')
      expect(user.lastName).toBe('User')
      expect(user.isActive).toBe(true)
    })

    it('should create a test user with overridden values', async () => {
      const projectCity = await createTestProjectCity()
      
      const user = await createTestUser({
        username: 'customuser',
        firstName: 'Custom',
        lastName: 'TestUser',
        email: 'custom@test.com',
        projectCityId: projectCity.id
      })
      
      expect(user.username).toBe('customuser')
      expect(user.firstName).toBe('Custom')
      expect(user.lastName).toBe('TestUser')
      expect(user.email).toBe('custom@test.com')
      expect(user.projectCityId).toBe(projectCity.id)
    })

    it('should create an inactive user when specified', async () => {
      const user = await createTestUser({
        isActive: false
      })
      
      expect(user.isActive).toBe(false)
    })
  })
})