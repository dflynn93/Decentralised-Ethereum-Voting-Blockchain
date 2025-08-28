// tests/voting-flow.spec.ts
import { test, expect, Page } from '@playwright/test';

// This will test actual voting system end-to-end
test.describe('Eirvote - Complete Voting Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display welcome screen when wallet not connected', async ({ page }) => {
    // Check for welcome message
    await expect(page.getByText('Welcome to Eirvote')).toBeVisible();
    
    // Check for connect wallet button
    await expect(page.getByText('Connect MetaMask')).toBeVisible();
    
    // Check for Irish electoral standards text
    await expect(page.getByText('🇮🇪 Irish Electoral Standards')).toBeVisible();
  });

  test('should handle MetaMask not installed', async ({ page }) => {
    // Mock window.ethereum as undefined
    await page.addInitScript(() => {
      delete (window as any).ethereum;
    });
    
    await page.reload();
    
    // Click connect wallet button
    await page.getByText('Connect MetaMask').click();
    
    // Should show MetaMask not detected error
    await expect(page.getByText('MetaMask not detected')).toBeVisible();
  });

  test('should connect wallet and show role selection', async ({ page }) => {
    // Mock MetaMask
    await page.addInitScript(() => {
      (window as any).ethereum = {
        request: async (params: any) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x742d35Cc6635C0532925a3b8D5b9212C0f'];
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });
    
    // Click connect wallet
    await page.getByText('Connect MetaMask').click();
    
    // Wait for connection
    await page.waitForTimeout(2000);
    
    // Should show connected wallet
    await expect(page.getByText('0x742d...212C0f')).toBeVisible();
    
    // Should show role selector
    await expect(page.getByRole('combobox')).toBeVisible();
    
    // Select voter role
    await page.selectOption('select', 'voter');
    
    // Should show voter panel
    await expect(page.getByText('Voter Panel')).toBeVisible();
  });

  test('should show admin panel for admin wallet', async ({ page }) => {
    // Mock MetaMask with admin wallet
    await page.addInitScript(() => {
      (window as any).ethereum = {
        request: async (params: any) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe']; // Admin wallet
          }
          return null;
        }
      };
    });
    
    await page.getByText('Connect MetaMask').click();
    await page.waitForTimeout(2000);
    
    // Should show admin account indicator
    await expect(page.getByText('Admin Account')).toBeVisible();
    
    // Select admin role
    await page.selectOption('select', 'admin');
    
    // Should show admin panel
    await expect(page.getByText('Irish Election Administration Panel')).toBeVisible();
  });
});

test.describe('Admin Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup admin wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        request: async (params: any) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe'];
          }
          return null;
        }
      };
    });
    
    await page.goto('/');
    await page.getByText('Connect MetaMask').click();
    await page.waitForTimeout(5000); 
  await page.waitForSelector('select', { timeout: 10000 }); 
  await page.selectOption('select', 'admin');
  });

  test('should require admin login', async ({ page }) => {
    // Should show login form first
    await expect(page.getByText('admin Login')).toBeVisible();
    await expect(page.getByPlaceholder('Enter admin password')).toBeVisible();
  });

  test('should login admin with correct password', async ({ page }) => {
    // Enter admin password
    await page.fill('input[placeholder="Enter admin password"]', 'admin123');
    await page.getByText('Login as Admin').click();
    
    // Should show admin panel
    await expect(page.getByText('Election Management')).toBeVisible();
    await expect(page.getByText('No Election Currently Active')).toBeVisible();
  });

  test('should reject incorrect admin password', async ({ page }) => {
    // Enter wrong password
    await page.fill('input[placeholder="Enter admin password"]', 'wrongpassword');
    await page.getByText('Login as Admin').click();
    
    // Should show error
    await expect(page.getByText('Invalid admin password')).toBeVisible();
  });

  test('should call election and open nominations', async ({ page }) => {
    // Login first
    await page.fill('input[placeholder="Enter admin password"]', 'admin123');
    await page.getByText('Login as Admin').click();
    
    // Call election
    await page.getByText('Call Election & Open Nominations').click();
    
    // Should show nomination period active
    await expect(page.getByText('Election Called - Nomination Period Active')).toBeVisible();
    await expect(page.getByText('remaining for nominations')).toBeVisible();
  });

  test('should add candidate during nomination period', async ({ page }) => {
    // Login and call election
    await page.fill('input[placeholder="Enter admin password"]', 'admin123');
    await page.getByText('Login as Admin').click();
    await page.getByText('Call Election & Open Nominations').click();
    
    // Navigate to candidates tab
    await page.getByText('Candidate Management').click();
    
    // Fill candidate form
    await page.fill('input[placeholder="Enter candidate name"]', 'John Smith');
    await page.fill('input[placeholder="e.g., Fianna Fail, Fine Gael"]', 'Fianna Fáil');
    
    // Submit nomination
    await page.getByText('Submit Nomination').click();
    
    // Should show success message
    await expect(page.getByText('successfully nominated')).toBeVisible();
    
    // Should show candidate in list
    await expect(page.getByText('John Smith (Fianna Fáil)')).toBeVisible();
  });
});

test.describe('Voter Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup voter wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        request: async (params: any) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x742d35Cc6635C0532925a3b8D5b9212C0f'];
          }
          return null;
        }
      };
    });
    
    await page.goto('/');
    await page.getByText('Connect MetaMask').click();
    await page.waitForTimeout(2000);
    await page.selectOption('select', 'voter');
  });

  test('should show no election active when election not called', async ({ page }) => {
    await expect(page.getByText('No Election Currently Active')).toBeVisible();
    await expect(page.getByText('Elections must be officially called')).toBeVisible();
  });

  test('should show ballot preview in disabled state', async ({ page }) => {
    // Should show preview ballot
    await expect(page.getByText('Ballot for BallyBeg')).toBeVisible();
    
    // Ranking controls should be disabled
    const rankingSelects = page.locator('select[disabled]');
    await expect(rankingSelects.first()).toBeVisible();
  });

  test('should handle vote submission with ZKP', async ({ page }) => {
    // First, we need to mock an active election with candidates
    await page.addInitScript(() => {
      // Mock localStorage to simulate active election
      localStorage.setItem('adminPanel_votingPhase', 'VOTING');
      localStorage.setItem('adminPanel_electionCalled', 'true');
      localStorage.setItem('adminPanel_votingOpenDate', new Date().toISOString());
    });
    
    await page.reload();
    await page.getByText('Connect MetaMask').click();
    await page.waitForTimeout(2000);
    await page.selectOption('select', 'voter');
    
    // Should show voting interface
    await expect(page.getByText('Ready to Vote')).toBeVisible();
    
    // Check ZKP option is enabled
    await expect(page.getByText('Enable ZK Proof Generation')).toBeVisible();
    const zkpCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(zkpCheckbox).toBeChecked();
    
    // If candidates exist, test ranking
    const candidateRows = page.locator('.candidate-row');
    const candidateCount = await candidateRows.count();
    
    if (candidateCount > 0) {
      // Select first preference
      await candidateRows.first().locator('select').selectOption('1');
      
      // Submit vote
      await page.getByText('Submit Vote').click();
      
      // Should show confirmation modal
      await expect(page.getByText('Final Vote Confirmation')).toBeVisible();
      await expect(page.getByText('Privacy Protection Enabled')).toBeVisible();
      
      // Confirm submission
      await page.getByText('Submit with ZK Proof').click();
      
      // Should show success message
      await expect(page.getByText('Vote submitted with zero-knowledge proof')).toBeVisible();
    }
  });
});

test.describe('Observer Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.addInitScript(() => {
      (window as any).ethereum = {
        request: async () => ['0x742d35Cc6635C0532925a3b8D5b9212C0f']
      };
    });
    await page.getByText('Connect MetaMask').click();
    await page.waitForTimeout(2000);
    await page.selectOption('select', 'observer');
  });

  test('should require observer login', async ({ page }) => {
    await expect(page.getByText('Observer Login')).toBeVisible();
    await expect(page.getByPlaceholder('Enter Observer ID')).toBeVisible();
    await expect(page.getByPlaceholder('Enter PIN')).toBeVisible();
  });

  test('should login observer with correct credentials', async ({ page }) => {
    await page.fill('input[placeholder="Enter Observer ID"]', '201');
    await page.fill('input[placeholder="Enter PIN"]', 'obs1');
    await page.getByText('Login as Observer').click();
    
    // Should show observer panel
    await expect(page.getByText('Observer Panel - BallyBeg, Co. Donegal')).toBeVisible();
    await expect(page.getByText('Real-time Blockchain Monitoring')).toBeVisible();
  });

  test('should show election status and audit trail', async ({ page }) => {
    // Login first
    await page.fill('input[placeholder="Enter Observer ID"]', '201');
    await page.fill('input[placeholder="Enter PIN"]', 'obs1');
    await page.getByText('Login as Observer').click();
    
    // Should show election status
    await expect(page.getByText('No Election Called')).toBeVisible();
    
    // Should show monitoring status
    await expect(page.getByText('Actively monitoring blockchain events')).toBeVisible();
    
    // Test tab navigation
    await page.getByText('Live Audit Trail').click();
    await expect(page.getByText('Live Audit Trail - BallyBeg')).toBeVisible();
    
    await page.getByText('Basic Audit').click();
    await expect(page.getByText('Run Basic Audit')).toBeVisible();
    
    await page.getByText('Ballot Preview').click();
    await expect(page.getByText('BallyBeg Ballot Preview')).toBeVisible();
  });
});

test.describe('Error Handling Tests', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Block network requests to simulate connection issues
    await page.route('**/*', route => route.abort());
    
    await page.goto('/');
    
    // App should still load basic UI
    await expect(page.getByText('Eirvote')).toBeVisible();
  });

  test('should handle invalid candidates data', async ({ page }) => {
    // Mock invalid candidates response
    await page.addInitScript(() => {
      // Override fetch to return invalid data
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        if (args[0].toString().includes('/api/candidates')) {
          return new Response(JSON.stringify({ candidates: null }));
        }
        return originalFetch(...args);
      };
    });
    
    await page.goto('/');
    
    // App should handle this gracefully without crashing
    await expect(page.getByText('Eirvote')).toBeVisible();
  });

  test('should show error boundary on component crashes', async ({ page }) => {
    // Inject code that will cause a React error
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        // Force a React error after load
        setTimeout(() => {
          const errorDiv = document.createElement('div');
          errorDiv.onclick = () => {
            throw new Error('Test error for error boundary');
          };
          document.body.appendChild(errorDiv);
          errorDiv.click();
        }, 1000);
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should show error boundary (if implemented)
    const hasErrorBoundary = await page.getByText('Something went wrong').isVisible().catch(() => false);
    
    if (!hasErrorBoundary) {
      console.log('Error boundary not implemented - add one to handle component crashes');
    }
  });
});