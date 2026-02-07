export const mockPosts = [
  {
    id: '1',
    titulo: 'Test Post 1',
    slug: 'test-post-1',
    body: '# Heading\n\nThis is **bold** text.',
    imagen_url: 'https://example.com/image1.jpg',
    fecha: '2026-02-01T00:00:00Z',
  },
  {
    id: '2',
    titulo: 'Test Post 2',
    slug: 'test-post-2',
    body: 'Plain text content.',
    imagen_url: null,
    fecha: '2026-02-05T00:00:00Z',
  },
];

export const mockContactData = {
  valid: {
    nombre: 'Test User',
    correo: 'test@example.com',
    mensaje: 'This is a valid test message with enough characters.',
  },
  invalid: {
    nombre: '',
    correo: 'invalid-email',
    mensaje: 'Short',
  },
};
