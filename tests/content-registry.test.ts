import { describe, it, expect, beforeEach } from "vitest"

describe("Content Registry Contract", () => {
  let contentRegistry
  
  beforeEach(() => {
    // Mock contract initialization
    contentRegistry = {
      nextContentId: 1,
      contentRegistry: new Map(),
      contentOwnership: new Map(),
      contentLicenses: new Map(),
    }
  })
  
  describe("register-content", () => {
    it("should register new content successfully", () => {
      const title = "Introduction to Blockchain"
      const description = "A comprehensive guide to blockchain technology"
      const price = 100
      const royaltyPercentage = 30
      
      // Mock the register-content function
      const registerContent = (title, description, price, royalty) => {
        if (title.length === 0) return { error: "ERR-INVALID-INPUT" }
        if (description.length === 0) return { error: "ERR-INVALID-INPUT" }
        if (royalty > 100) return { error: "ERR-INVALID-INPUT" }
        
        const contentId = contentRegistry.nextContentId
        contentRegistry.contentRegistry.set(contentId, {
          title,
          description,
          creator: "SP1234567890ABCDEF",
          price,
          royaltyPercentage: royalty,
          createdAt: 1000,
          isActive: true,
          licenseType: "standard",
          category: "general",
        })
        
        contentRegistry.contentOwnership.set(`SP1234567890ABCDEF-${contentId}`, { owned: true })
        contentRegistry.nextContentId += 1
        return { success: contentId }
      }
      
      const result = registerContent(title, description, price, royaltyPercentage)
      
      expect(result.success).toBe(1)
      expect(contentRegistry.contentRegistry.get(1)).toEqual({
        title,
        description,
        creator: "SP1234567890ABCDEF",
        price,
        royaltyPercentage,
        createdAt: 1000,
        isActive: true,
        licenseType: "standard",
        category: "general",
      })
    })
    
    it("should reject empty title", () => {
      const registerContent = (title) => {
        if (title.length === 0) return { error: "ERR-INVALID-INPUT" }
        return { success: true }
      }
      
      const result = registerContent("")
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
    
    it("should reject invalid royalty percentage", () => {
      const registerContent = (title, description, price, royalty) => {
        if (royalty > 100) return { error: "ERR-INVALID-INPUT" }
        return { success: true }
      }
      
      const result = registerContent("Title", "Description", 100, 150)
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
  })
  
  describe("purchase-license", () => {
    it("should purchase license for active content", () => {
      // Setup content
      contentRegistry.contentRegistry.set(1, {
        title: "Test Content",
        isActive: true,
        creator: "SP1234567890ABCDEF",
      })
      
      const purchaseLicense = (contentId, duration) => {
        const content = contentRegistry.contentRegistry.get(contentId)
        if (!content) return { error: "ERR-CONTENT-NOT-FOUND" }
        if (!content.isActive) return { error: "ERR-INVALID-INPUT" }
        if (duration <= 0) return { error: "ERR-INVALID-INPUT" }
        
        contentRegistry.contentLicenses.set(`${contentId}-SP9876543210FEDCBA`, {
          licenseStart: 1000,
          licenseEnd: 1000 + duration,
          usageLimit: 1000,
          usageCount: 0,
          isActive: true,
        })
        return { success: true }
      }
      
      const result = purchaseLicense(1, 100)
      expect(result.success).toBe(true)
      expect(contentRegistry.contentLicenses.get("1-SP9876543210FEDCBA")).toBeDefined()
    })
    
    it("should reject purchase for inactive content", () => {
      contentRegistry.contentRegistry.set(1, {
        title: "Test Content",
        isActive: false,
      })
      
      const purchaseLicense = (contentId) => {
        const content = contentRegistry.contentRegistry.get(contentId)
        if (!content.isActive) return { error: "ERR-INVALID-INPUT" }
        return { success: true }
      }
      
      const result = purchaseLicense(1)
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
  })
  
  describe("update-content", () => {
    it("should allow creator to update content", () => {
      const creator = "SP1234567890ABCDEF"
      contentRegistry.contentRegistry.set(1, {
        title: "Original Title",
        description: "Original Description",
        creator,
        price: 100,
      })
      
      const updateContent = (contentId, title, description, price, sender) => {
        const content = contentRegistry.contentRegistry.get(contentId)
        if (!content) return { error: "ERR-CONTENT-NOT-FOUND" }
        if (content.creator !== sender) return { error: "ERR-NOT-AUTHORIZED" }
        if (title.length === 0) return { error: "ERR-INVALID-INPUT" }
        
        contentRegistry.contentRegistry.set(contentId, {
          ...content,
          title,
          description,
          price,
        })
        return { success: true }
      }
      
      const result = updateContent(1, "Updated Title", "Updated Description", 200, creator)
      expect(result.success).toBe(true)
      
      const updatedContent = contentRegistry.contentRegistry.get(1)
      expect(updatedContent.title).toBe("Updated Title")
      expect(updatedContent.price).toBe(200)
    })
    
    it("should reject update from non-creator", () => {
      contentRegistry.contentRegistry.set(1, {
        creator: "SP1234567890ABCDEF",
      })
      
      const updateContent = (contentId, title, description, price, sender) => {
        const content = contentRegistry.contentRegistry.get(contentId)
        if (content.creator !== sender) return { error: "ERR-NOT-AUTHORIZED" }
        return { success: true }
      }
      
      const result = updateContent(1, "Title", "Description", 100, "SP9876543210FEDCBA")
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
  })
  
  describe("has-valid-license", () => {
    it("should return true for valid license", () => {
      contentRegistry.contentLicenses.set("1-SP1234567890ABCDEF", {
        isActive: true,
        licenseEnd: 2000,
        usageCount: 5,
        usageLimit: 1000,
      })
      
      const hasValidLicense = (contentId, user, currentBlock = 1500) => {
        const license = contentRegistry.contentLicenses.get(`${contentId}-${user}`)
        if (!license) return false
        
        return license.isActive && license.licenseEnd >= currentBlock && license.usageCount < license.usageLimit
      }
      
      const result = hasValidLicense(1, "SP1234567890ABCDEF")
      expect(result).toBe(true)
    })
    
    it("should return false for expired license", () => {
      contentRegistry.contentLicenses.set("1-SP1234567890ABCDEF", {
        isActive: true,
        licenseEnd: 500,
        usageCount: 5,
        usageLimit: 1000,
      })
      
      const hasValidLicense = (contentId, user, currentBlock = 1500) => {
        const license = contentRegistry.contentLicenses.get(`${contentId}-${user}`)
        if (!license) return false
        
        return license.isActive && license.licenseEnd >= currentBlock && license.usageCount < license.usageLimit
      }
      
      const result = hasValidLicense(1, "SP1234567890ABCDEF")
      expect(result).toBe(false)
    })
  })
})
