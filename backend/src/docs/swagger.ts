export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'mshipping API Documentation',
    version: '1.0.0',
    description: 'Dokumentasi REST API backend sistem logistik dan pengiriman mshipping (Hono.js + Bun + Prisma ORM + MS SQL Server).',
    contact: {
      name: 'mshipping Dev Team',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Base Path (Local / Proxy)',
    },
    {
      url: '/mshipping/api',
      description: 'Production Sub-path Base URL',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan JWT Token dengan format: Bearer <token>',
      },
    },
    schemas: {
      ApiResponseSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              total: { type: 'number', example: 100 },
              totalPages: { type: 'number', example: 5 },
            },
          },
        },
      },
      ApiResponseError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Pesan kesalahan' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', format: 'password', example: 'password123' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'newuser' },
          password: { type: 'string', format: 'password', example: 'secret123' },
          fullName: { type: 'string', example: 'John Doe' },
          role: { type: 'string', enum: ['admin', 'viewer'], example: 'viewer' },
        },
      },
      ProfileUpdateRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'John Doe Updated' },
          avatarUrl: { type: 'string', nullable: true, example: '/uploads/avatars/user-123.jpg' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password', example: 'oldPassword123' },
          newPassword: { type: 'string', format: 'password', example: 'newStrongPassword456' },
        },
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['isActive'],
        properties: {
          isActive: { type: 'boolean', example: true },
        },
      },
      UpdateUserRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'viewer'], example: 'admin' },
        },
      },
      RolePermissionsUpdateRequest: {
        type: 'object',
        required: ['permissions'],
        properties: {
          permissions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', example: '/mshipping/billing' },
                canView: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      UpdateEffectiveDateRequest: {
        type: 'object',
        required: ['effectiveDate'],
        properties: {
          effectiveDate: { type: 'string', format: 'date', example: '2026-03-01' },
        },
      },
      SetUploadMarkingsRequest: {
        type: 'object',
        required: ['markings'],
        properties: {
          markings: {
            type: 'array',
            items: {
              type: 'object',
              required: ['markingCode'],
              properties: {
                markingCode: { type: 'string', example: 'GZC' },
                agentName: { type: 'string', example: 'Agent Express' },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    // ---------------- AUTH ----------------
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login User',
        description: 'Autentikasi user dan dapatkan JWT Bearer Token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Login Berhasil', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          401: { description: 'Kredensial tidak valid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
          429: { description: 'Terlalu banyak percobaan login', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Registrasi User Baru',
        description: 'Mendaftarkan akun pengguna baru.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: { description: 'User berhasil didaftarkan', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          400: { description: 'Validasi input gagal', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Ambil Info User Saat Ini',
        description: 'Mengambil informasi user yang sedang login dari Bearer Token.',
        responses: {
          200: { description: 'Data user berhasil diambil', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
        },
      },
    },

    // ---------------- PROFILE ----------------
    '/profile': {
      get: {
        tags: ['User Profile'],
        summary: 'Detail Profil User',
        description: 'Mengambil rincian profil user saat ini termasuk nama lengkap dan avatar.',
        responses: {
          200: { description: 'Berhasil mengambil profil', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
        },
      },
      put: {
        tags: ['User Profile'],
        summary: 'Update Profil User',
        description: 'Memperbarui nama lengkap dan avatar user.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProfileUpdateRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Profil berhasil diperbarui', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
        },
      },
    },
    '/profile/password': {
      put: {
        tags: ['User Profile'],
        summary: 'Ubah Password',
        description: 'Mengganti password akun user saat ini.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Password berhasil diubah', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          400: { description: 'Password lama salah atau input tidak valid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
        },
      },
    },
    '/profile/avatar': {
      post: {
        tags: ['User Profile'],
        summary: 'Upload Foto Profil (Avatar)',
        description: 'Mengunggah file gambar avatar pengguna.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  avatar: { type: 'string', format: 'binary', description: 'File gambar (png, jpg, jpeg, webp)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Avatar berhasil diupload', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          400: { description: 'File tidak valid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseError' } } } },
        },
      },
      delete: {
        tags: ['User Profile'],
        summary: 'Hapus Foto Profil',
        description: 'Menghapus avatar pengguna dan mengembalikan ke avatar default.',
        responses: {
          200: { description: 'Avatar berhasil dihapus', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
        },
      },
    },

    // ---------------- USERS (ADMIN) ----------------
    '/users': {
      get: {
        tags: ['User Management (Admin)'],
        summary: 'Daftar Semua User',
        description: 'Mengambil seluruh data user aktif (khusus Admin).',
        responses: {
          200: { description: 'Berhasil mengambil daftar user', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
          403: { description: 'Forbidden (Hanya Admin)' },
        },
      },
    },
    '/users/trash': {
      get: {
        tags: ['User Management (Admin)'],
        summary: 'Daftar User di Trash (Soft Deleted)',
        description: 'Mengambil daftar user yang telah dihapus sementara.',
        responses: {
          200: { description: 'Berhasil mengambil daftar trash', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['User Management (Admin)'],
        summary: 'Ubah Status Aktif User',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserStatusRequest' } } },
        },
        responses: { 200: { description: 'Status berhasil diperbarui' } },
      },
    },
    '/users/{id}/role': {
      patch: {
        tags: ['User Management (Admin)'],
        summary: 'Ubah Role User',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRoleRequest' } } },
        },
        responses: { 200: { description: 'Role berhasil diperbarui' } },
      },
    },
    '/users/{id}': {
      delete: {
        tags: ['User Management (Admin)'],
        summary: 'Soft Delete User',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User berhasil dipindahkan ke trash' } },
      },
    },
    '/users/{id}/restore': {
      patch: {
        tags: ['User Management (Admin)'],
        summary: 'Restore User dari Trash',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User berhasil dipulihkan' } },
      },
    },
    '/users/{id}/permanent': {
      delete: {
        tags: ['User Management (Admin)'],
        summary: 'Hapus User Permanen',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User berhasil dihapus permanen' } },
      },
    },

    // ---------------- ROLES ----------------
    '/roles': {
      get: {
        tags: ['Roles & Permissions (Admin)'],
        summary: 'Daftar Semua Roles',
        responses: { 200: { description: 'Berhasil mengambil daftar roles' } },
      },
    },
    '/roles/{role}': {
      get: {
        tags: ['Roles & Permissions (Admin)'],
        summary: 'Ambil Permission Role',
        parameters: [{ name: 'role', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Berhasil' } },
      },
      put: {
        tags: ['Roles & Permissions (Admin)'],
        summary: 'Update Permission Role',
        parameters: [{ name: 'role', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RolePermissionsUpdateRequest' } } },
        },
        responses: { 200: { description: 'Permission berhasil diperbarui' } },
      },
      post: {
        tags: ['Roles & Permissions (Admin)'],
        summary: 'Buat Custom Role Baru',
        parameters: [{ name: 'role', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Role berhasil dibuat' }, 409: { description: 'Role sudah ada' } },
      },
    },

    // ---------------- DASHBOARD ----------------
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Statistik & Ringkasan Dashboard',
        description: 'Mengambil ringkasan metrik operasional pengiriman, billing, dan KPI utama.',
        responses: { 200: { description: 'Statistik berhasil dimuat' } },
      },
    },

    // ---------------- CUSTOMERS ----------------
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Daftar Customer',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { 200: { description: 'Daftar customer berhasil dimuat' } },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Detail Customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Detail customer ditemukan' }, 404: { description: 'Customer tidak ditemukan' } },
      },
    },

    // ---------------- SHIPMENT BATCHES / MARKING ----------------
    '/marking': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'Daftar Marking Batches',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'markingGroup', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Daftar marking berhasil dimuat' } },
      },
    },
    '/marking/kpi': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'KPI Metrik Marking',
        responses: { 200: { description: 'KPI marking berhasil dimuat' } },
      },
    },
    '/marking/exit-history': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'Riwayat Pengeluaran / Exit History Marking',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Riwayat exit marking berhasil dimuat' } },
      },
    },
    '/marking/groups': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'Daftar Kelompok Marking (Groups)',
        responses: { 200: { description: 'Daftar group marking berhasil dimuat' } },
      },
    },
    '/marking/{id}': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'Detail Marking',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Detail marking ditemukan' }, 404: { description: 'Marking tidak ditemukan' } },
      },
    },
    '/marking/{id}/manifest': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'Manifest Barang per Marking',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Manifest marking berhasil dimuat' } },
      },
    },
    '/marking/{id}/manifest/search': {
      get: {
        tags: ['Shipment Batches / Marking'],
        summary: 'Pencarian / Suggestion Manifest Marking',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Hasil pencarian manifest' } },
      },
    },

    // ---------------- DELIVERY ORDERS ----------------
    '/delivery-orders': {
      get: {
        tags: ['Delivery Orders (Surat Jalan)'],
        summary: 'Daftar Surat Jalan (Delivery Orders)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Daftar DO berhasil dimuat' } },
      },
    },
    '/delivery-orders/kpi': {
      get: {
        tags: ['Delivery Orders (Surat Jalan)'],
        summary: 'KPI Metrik Surat Jalan',
        responses: { 200: { description: 'KPI DO berhasil dimuat' } },
      },
    },
    '/delivery-orders/grouped': {
      get: {
        tags: ['Delivery Orders (Surat Jalan)'],
        summary: 'Daftar Surat Jalan Grouped by List Code',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Data DO Grouped berhasil dimuat' } },
      },
    },
    '/delivery-orders/marking-groups': {
      get: {
        tags: ['Delivery Orders (Surat Jalan)'],
        summary: 'Group Marking pada Surat Jalan',
        responses: { 200: { description: 'Marking groups berhasil dimuat' } },
      },
    },
    '/delivery-orders/branch-groups': {
      get: {
        tags: ['Delivery Orders (Surat Jalan)'],
        summary: 'Group Cabang pada Surat Jalan',
        responses: { 200: { description: 'Branch groups berhasil dimuat' } },
      },
    },
    '/delivery-orders/{id}': {
      get: {
        tags: ['Delivery Orders (Surat Jalan)'],
        summary: 'Detail Surat Jalan',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Detail DO ditemukan' }, 404: { description: 'Surat Jalan tidak ditemukan' } },
      },
    },

    // ---------------- BILLING ----------------
    '/billing': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Daftar Tagihan / Billing',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Daftar billing berhasil dimuat' } },
      },
    },
    '/billing/kpi': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'KPI Metrik Billing & Tagihan',
        responses: { 200: { description: 'KPI billing berhasil dimuat' } },
      },
    },
    '/billing/target-details': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Rincian Target Billing',
        responses: { 200: { description: 'Target details berhasil dimuat' } },
      },
    },
    '/billing/chart/by-employee-daily': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Grafik Billing Harian per Karyawan',
        responses: { 200: { description: 'Grafik harian karyawan berhasil dimuat' } },
      },
    },
    '/billing/chart/trends': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Grafik Tren Pendapatan Billing',
        responses: { 200: { description: 'Tren billing berhasil dimuat' } },
      },
    },
    '/billing/chart/sj-vs-bill': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Perbandingan Surat Jalan vs Billing',
        responses: { 200: { description: 'Perbandingan SJ vs Bill berhasil dimuat' } },
      },
    },
    '/billing/chart/sj-vs-bill/details': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Detail Perbandingan Surat Jalan vs Billing',
        responses: { 200: { description: 'Detail perbandingan berhasil dimuat' } },
      },
    },
    '/billing/m3-check/{listCode}': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Validasi Perhitungan Kubikasi (M3 Check)',
        parameters: [{ name: 'listCode', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Hasil validasi M3 check' } },
      },
    },
    '/billing/m3-cust-marking-details': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Rincian M3 Customer per Marking',
        parameters: [
          { name: 'custCode', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'markingCode', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Rincian M3 berhasil dimuat' } },
      },
    },
    '/billing/{id}': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Detail Billing / Invoice',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Detail billing ditemukan' }, 404: { description: 'Billing tidak ditemukan' } },
      },
    },
    '/billing/{id}/details': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Item Rincian Barang Tagihan',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Item rincian billing ditemukan' } },
      },
    },

    // ---------------- SHIPMENTS ----------------
    '/shipments': {
      get: {
        tags: ['Shipments'],
        summary: 'Daftar Pengiriman (Shipments)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'branch', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Daftar pengiriman berhasil dimuat' } },
      },
    },
    '/shipments/kpi': {
      get: {
        tags: ['Shipments'],
        summary: 'KPI Metrik Pengiriman (Shipments)',
        responses: { 200: { description: 'KPI pengiriman berhasil dimuat' } },
      },
    },
    '/shipments/branches': {
      get: {
        tags: ['Shipments'],
        summary: 'Daftar Cabang Pengiriman',
        responses: { 200: { description: 'Daftar cabang berhasil dimuat' } },
      },
    },
    '/shipments/{id}': {
      get: {
        tags: ['Shipments'],
        summary: 'Detail Pengiriman',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Detail shipment ditemukan' }, 404: { description: 'Shipment tidak ditemukan' } },
      },
    },
    '/shipments/{id}/dimensions': {
      get: {
        tags: ['Shipments'],
        summary: 'Dimensi & Ukuran Pengiriman',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Dimensi shipment berhasil dimuat' } },
      },
    },
    '/shipments/{id}/dimensions/gudang': {
      get: {
        tags: ['Shipments'],
        summary: 'Dimensi Pengiriman versi Gudang',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Dimensi gudang berhasil dimuat' } },
      },
    },
    '/shipments/{id}/dimensions/packinglist': {
      get: {
        tags: ['Shipments'],
        summary: 'Dimensi Pengiriman versi Packing List',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Dimensi packing list berhasil dimuat' } },
      },
    },
    '/shipments/{id}/dimensions/komplain': {
      get: {
        tags: ['Shipments'],
        summary: 'Dimensi Pengiriman yang Dikomplain / Selisih',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Dimensi komplain berhasil dimuat' } },
      },
    },

    // ---------------- MASTER PRICE LIST ----------------
    '/price-list/branches': {
      get: {
        tags: ['Master Price List'],
        summary: 'Daftar Cabang Price List',
        responses: { 200: { description: 'Berhasil' } },
      },
    },
    '/price-list/uploads': {
      get: {
        tags: ['Master Price List'],
        summary: 'Riwayat Upload File Master Price List',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Riwayat upload berhasil dimuat' } },
      },
    },
    '/price-list/uploads/latest/diff': {
      get: {
        tags: ['Master Price List'],
        summary: 'Diff / Selisih Upload Terakhir vs Sebelumnya',
        responses: { 200: { description: 'Perubahan tarif terakhir berhasil dimuat' } },
      },
    },
    '/price-list/uploads/{id}/diff': {
      get: {
        tags: ['Master Price List'],
        summary: 'Diff / Selisih Upload Tertentu',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Perubahan tarif berhasil dimuat' } },
      },
    },
    '/price-list/uploads/{id}/effective-date': {
      patch: {
        tags: ['Master Price List'],
        summary: 'Update Tanggal Berlaku (Effective Date) Upload',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEffectiveDateRequest' } } },
        },
        responses: { 200: { description: 'Tanggal berlaku berhasil diupdate' } },
      },
    },
    '/price-list/filters': {
      get: {
        tags: ['Master Price List'],
        summary: 'Opsi Filter Price List (Sheet Type, Mode, Branch, Kategori)',
        parameters: [
          { name: 'sheetType', in: 'query', schema: { type: 'string' } },
          { name: 'mode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Opsi filter berhasil dimuat' } },
      },
    },
    '/price-list/trend': {
      get: {
        tags: ['Master Price List'],
        summary: 'Tren Riwayat Kenaikan/Penurunan Harga',
        parameters: [
          { name: 'sheetType', in: 'query', schema: { type: 'string' } },
          { name: 'mode', in: 'query', schema: { type: 'string' } },
          { name: 'branch', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Data tren harga berhasil dimuat' } },
      },
    },
    '/price-list/lookup': {
      get: {
        tags: ['Master Price List'],
        summary: 'Lookup / Pencarian Tarif Berdasarkan Kriteria',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sheetType', in: 'query', schema: { type: 'string' } },
          { name: 'mode', in: 'query', schema: { type: 'string' } },
          { name: 'branch', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'markingCode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Tarif ditemukan' } },
      },
    },
    '/price-list/uploads/{id}/markings': {
      get: {
        tags: ['Master Price List'],
        summary: 'Daftar Marking yang Terkait pada Upload Price List',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Berhasil' } },
      },
      put: {
        tags: ['Master Price List'],
        summary: 'Atur / Ganti Daftar Marking yang Terkait',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SetUploadMarkingsRequest' } } },
        },
        responses: { 200: { description: 'Marking berhasil disimpan' } },
      },
    },
    '/price-list/uploads/{id}/markings/{markingCode}': {
      delete: {
        tags: ['Master Price List'],
        summary: 'Hapus Asosiasi Marking dari Upload',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'markingCode', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Marking berhasil dihapus dari upload' } },
      },
    },
    '/price-list/entry-search': {
      get: {
        tags: ['Master Price List'],
        summary: 'Pencarian Entry Code untuk Auto-complete / Lookup',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Hasil pencarian entry' } },
      },
    },
    '/price-list/lookup-by-entry': {
      get: {
        tags: ['Master Price List'],
        summary: 'Lookup Tarif Lengkap Berdasarkan Entry Code',
        parameters: [{ name: 'listCode', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Tarif entry ditemukan' } },
      },
    },
    '/price-list/upload': {
      post: {
        tags: ['Master Price List'],
        summary: 'Upload File Excel Master Price List',
        description: 'Mengunggah file Excel master price list (.xlsx / .xls) dan memproses parsing ke database.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'effectiveDate'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'File Excel (.xlsx / .xls)' },
                  effectiveDate: { type: 'string', format: 'date', example: '2026-03-01' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'File berhasil diupload dan diproses' },
          400: { description: 'Format file atau tanggal tidak valid' },
          403: { description: 'Tidak memiliki izin upload' },
          500: { description: 'Gagal memproses file' },
        },
      },
    },

    // ---------------- CUSTOMER PRICE LIST ----------------
    '/customer-price-list': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Daftar Customer yang Memiliki Price List Khusus',
        responses: { 200: { description: 'Daftar customer dengan price list berhasil dimuat' } },
      },
    },
    '/customer-price-list/filters': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Filter Opsi Global Customer Price List',
        responses: { 200: { description: 'Filter opsi berhasil dimuat' } },
      },
    },
    '/customer-price-list/lookup': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Lookup Tarif Khusus Customer',
        parameters: [
          { name: 'custCode', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'mode', in: 'query', schema: { type: 'string' } },
          { name: 'branch', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'markingCode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Tarif khusus ditemukan' } },
      },
    },
    '/customer-price-list/{custCode}/active': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Price List Khusus Aktif untuk Customer Tertentu',
        parameters: [{ name: 'custCode', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Price list aktif customer berhasil dimuat' } },
      },
    },
    '/customer-price-list/{custCode}/uploads': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Riwayat Upload Price List untuk Customer Tertentu',
        parameters: [
          { name: 'custCode', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Riwayat upload customer berhasil dimuat' } },
      },
    },
    '/customer-price-list/{custCode}/filters': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Opsi Filter Khusus untuk Customer Tertentu',
        parameters: [{ name: 'custCode', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Filter opsi customer berhasil dimuat' } },
      },
    },
    '/customer-price-list/uploads/{id}/diff': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Diff / Selisih Perubahan Tarif Upload Customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Diff upload customer berhasil dimuat' } },
      },
    },
    '/customer-price-list/uploads/{id}/effective-date': {
      patch: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Update Tanggal Berlaku Upload Customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEffectiveDateRequest' } } },
        },
        responses: { 200: { description: 'Tanggal berlaku berhasil diupdate' } },
      },
    },
    '/customer-price-list/uploads/{id}/markings': {
      get: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Daftar Marking yang Terkait pada Upload Customer Price List',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Berhasil' } },
      },
      put: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Atur Marking yang Terkait pada Upload Customer Price List',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SetUploadMarkingsRequest' } } },
        },
        responses: { 200: { description: 'Marking berhasil disimpan' } },
      },
    },
    '/customer-price-list/uploads/{id}/markings/{markingCode}': {
      delete: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Hapus Asosiasi Marking dari Upload Customer Price List',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'markingCode', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Marking berhasil dihapus' } },
      },
    },
    '/customer-price-list/{custCode}/upload': {
      post: {
        tags: ['Customer Price List (Tarif Khusus)'],
        summary: 'Upload File Excel Price List Khusus Customer',
        parameters: [{ name: 'custCode', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'effectiveDate'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'File Excel (.xlsx / .xls)' },
                  effectiveDate: { type: 'string', format: 'date', example: '2026-03-01' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'File berhasil diupload dan diproses' },
          400: { description: 'Format file atau tanggal tidak valid' },
          403: { description: 'Tidak memiliki izin upload' },
          500: { description: 'Gagal memproses file' },
        },
      },
    },

    // ---------------- SYSTEM HEALTH ----------------
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health Check Endpoint',
        security: [],
        responses: {
          200: {
            description: 'Server dalam kondisi sehat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', example: '2026-08-24T01:30:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
