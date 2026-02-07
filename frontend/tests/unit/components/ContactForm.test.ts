import { describe, it, expect, vi } from 'vitest';
import { handleContactForm } from '../../../src/lib/contact-form';
import { JSDOM } from 'jsdom';

describe('handleContactForm', () => {
  it('submits form data successfully', async () => {
    const dom = new JSDOM(`
      <form id="contact-form">
        <input name="name" value="Test" />
        <input name="email" value="test@example.com" />
        <textarea id="message" name="message">Test message</textarea>
        <button id="submit-btn"></button>
        <div id="form-status" class="hidden">
          <p class="status-message"></p>
        </div>
        <span id="char-count">0</span>
        <div class="loading-icon"></div>
        <div class="send-icon"></div>
        <div class="success-icon"></div>
        <div class="error-icon"></div>
      </form>
    `);
    
    global.document = dom.window.document;
    const form = document.getElementById('contact-form') as HTMLFormElement;
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    handleContactForm(form, 'https://api.example.com');
    
    const submitEvent = new dom.window.Event('submit', { bubbles: true });
    form.dispatchEvent(submitEvent);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/contact', expect.any(Object));
    const statusMsg = form.querySelector('.status-message');
    expect(statusMsg?.textContent).toContain('Message sent successfully');
  });
});
