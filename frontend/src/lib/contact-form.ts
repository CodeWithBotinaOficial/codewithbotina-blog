export function handleContactForm(form: HTMLFormElement, apiUrl: string) {
  const submitBtn = form.querySelector('#submit-btn') as HTMLButtonElement;
  const loadingIcon = form.querySelector('.loading-icon');
  const sendIcon = form.querySelector('.send-icon');
  const statusDiv = form.querySelector('#form-status');
  const statusMsg = form.querySelector('.status-message');
  const successIcon = form.querySelector('.success-icon');
  const errorIcon = form.querySelector('.error-icon');
  const messageInput = form.querySelector('#message') as HTMLTextAreaElement;
  const charCount = form.querySelector('#char-count');

  if (!submitBtn || !messageInput || !charCount) {
    console.error("Contact form elements not found.");
    return;
  }

  messageInput.addEventListener('input', () => {
    charCount.textContent = messageInput.value.length.toString();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    statusDiv?.classList.add('hidden');
    submitBtn.disabled = true;
    loadingIcon?.classList.remove('hidden');
    sendIcon?.classList.add('hidden');

    const formData = new FormData(form);
    const data = {
      nombre: formData.get('name'),
      correo: formData.get('email'),
      mensaje: formData.get('message')
    };

    try {
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send message');

      statusDiv?.classList.remove('hidden', 'bg-red-50', 'text-red-800');
      statusDiv?.classList.add('bg-green-50', 'text-green-800');
      successIcon?.classList.remove('hidden');
      errorIcon?.classList.add('hidden');
      if (statusMsg) statusMsg.textContent = 'Message sent successfully! I will get back to you soon.';
      form.reset();
      charCount.textContent = '0';

    } catch (error) {
      statusDiv?.classList.remove('hidden', 'bg-green-50', 'text-green-800');
      statusDiv?.classList.add('bg-red-50', 'text-red-800');
      errorIcon?.classList.remove('hidden');
      successIcon?.classList.add('hidden');
      if (statusMsg) statusMsg.textContent = 'Failed to send message. Please try again later.';
    } finally {
      submitBtn.disabled = false;
      loadingIcon?.classList.add('hidden');
      sendIcon?.classList.remove('hidden');
    }
  });
}
