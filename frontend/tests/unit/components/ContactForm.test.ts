import { describe, it, expect, vi } from 'vitest';
import { handleContactForm } from '../../../src/lib/contact-form';
import { JSDOM } from 'jsdom';

describe('handleContactForm', () => {
  it('submits form data successfully', async () => {
    const dom = new JSDOM(`
      <form id="contact-form">
        <input name="name" value="Test" />
        <input name="email" value="test@example.com" />
        <textarea name="message">Test message</textarea>
        <button id="submit-btn"></button>
        <div id="form-status" class="hidden">
          <p class="status-message"></p>
        </div>
      </form>
    `);
    
    global.document = dom.window.document;
    const form = document.getElementById('contact-form') as HTMLFormElement;
    
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    // Mock FormData to avoid happy-dom issues
    global.FormData = class {
      constructor(form: HTMLFormElement) {
        this.form = form;
      }
      get(name: string) {
        const input = this.form.querySelector(`[name="${name}"]`) as HTMLInputElement;
        return input ? input.value : null;
      }
    } as any;

    handleContactForm(form, 'https://api.example.com');
    
    // Manually trigger submit
    const submitEvent = new dom.window.Event('submit', { bubbles: true });
    await form.dispatchEvent(submitEvent);

    // Use a small timeout to allow async operations in the handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/contact', expect.any(Object));
    const statusMsg = form.querySelector('.status-message');
    expect(statusMsg?.textContent).toContain('Message sent successfully');
  });
});
