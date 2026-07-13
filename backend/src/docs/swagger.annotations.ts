/**
 * @openapi
 * components:
 *   securitySchemes:
 *     UserBearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: User access token for protected user/admin routes.
 *     ProjectApiKeyAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: API Key
 *       description: Project API key used for AI inference routes.
 *   schemas:
 *     StandardResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *         data:
 *           nullable: true
 *         message:
 *           type: string
 *     AuthTokens:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *     AuthUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *           nullable: true
 *         lastName:
 *           type: string
 *           nullable: true
 *         phoneNo:
 *           type: string
 *           nullable: true
 *         countryCode:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         state:
 *           type: string
 *           nullable: true
 *         country:
 *           type: string
 *           nullable: true
 *         profileImage:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *         authProvider:
 *           type: string
 *           nullable: true
 *         timezone:
 *           type: string
 *           nullable: true
 *     LoginResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/AuthUser'
 *         tokens:
 *           $ref: '#/components/schemas/AuthTokens'
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     RegisterRequest:
 *       type: object
 *       required: [firstName, lastName, email, password]
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         phoneNo:
 *           type: string
 *         countryCode:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         country:
 *           type: string
 *         profileImage:
 *           type: string
 *         timezone:
 *           type: string
 *     RefreshRequest:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken:
 *           type: string
 *     LogoutRequest:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken:
 *           type: string
 *     ModelListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         providerId:
 *           type: string
 *         slug:
 *           type: string
 *         displayName:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         contextLength:
 *           type: integer
 *           nullable: true
 *         maxOutputTokens:
 *           type: integer
 *           nullable: true
 *         tokenizer:
 *           type: string
 *           nullable: true
 *         inputPricePerToken:
 *           type: number
 *           nullable: true
 *         outputPricePerToken:
 *           type: number
 *           nullable: true
 *         cacheWritePricePerToken:
 *           type: number
 *           nullable: true
 *         cacheReadPricePerToken:
 *           type: number
 *           nullable: true
 *         inputModalities:
 *           type: array
 *           items:
 *             type: string
 *         outputModalities:
 *           type: array
 *           items:
 *             type: string
 *         supportedParameters:
 *           type: array
 *           items:
 *             type: string
 *         defaultForCapabilities:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *     CreateApiKeyRequest:
 *       type: object
 *       required: [userId, projectId]
 *       properties:
 *         userId:
 *           type: string
 *         projectId:
 *           type: string
 *         name:
 *           type: string
 *         creditLimit:
 *           oneOf:
 *             - type: number
 *             - type: string
 *         limitType:
 *           type: string
 *           enum: [DAILY, WEEKLY, MONTHLY, QUATERLY, YEARLY]
 *         status:
 *           type: string
 *           enum: [ACTIVE, REVOKED, INACTIVE, EXPIRED, EXHAUSTED]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *     UpdateApiKeyRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         creditLimit:
 *           oneOf:
 *             - type: number
 *             - type: string
 *         limitType:
 *           type: string
 *           nullable: true
 *           enum: [DAILY, WEEKLY, MONTHLY, QUATERLY, YEARLY]
 *         status:
 *           type: string
 *           enum: [ACTIVE, REVOKED, INACTIVE, EXPIRED, EXHAUSTED]
 *         expiresAt:
 *           type: string
 *           nullable: true
 *           format: date-time
 *     CreateProviderRequest:
 *       type: object
 *       required: [slug, displayName]
 *       properties:
 *         slug:
 *           type: string
 *         displayName:
 *           type: string
 *         description:
 *           type: string
 *         baseUrl:
 *           type: string
 *           format: uri
 *         isActive:
 *           type: boolean
 *     UpdateProviderRequest:
 *       type: object
 *       properties:
 *         slug:
 *           type: string
 *         displayName:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         baseUrl:
 *           type: string
 *           nullable: true
 *           format: uri
 *         isActive:
 *           type: boolean
 *     AmountRequest:
 *       type: object
 *       properties:
 *         amount:
 *           oneOf:
 *             - type: number
 *             - type: string
 *         description:
 *           type: string
 *         createdBy:
 *           type: string
 *         referenceId:
 *           type: string
 *     WalletAdminAmountRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/AmountRequest'
 *         - type: object
 *           required: [userId, amount]
 *           properties:
 *             userId:
 *               type: string
 *     WalletDeductRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/WalletAdminAmountRequest'
 *         - type: object
 *           properties:
 *             inferenceRequestId:
 *               type: string
 *     ChatMessage:
 *       type: object
 *       required: [role, content]
 *       properties:
 *         role:
 *           type: string
 *           enum: [system, user, assistant, tool]
 *         content:
 *           type: string
 *         name:
 *           type: string
 *         toolCallId:
 *           type: string
 *     ChatCompletionRequest:
 *       type: object
 *       required: [model, messages]
 *       properties:
 *         model:
 *           type: string
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatMessage'
 *         temperature:
 *           type: number
 *           minimum: 0
 *           maximum: 2
 *         max_tokens:
 *           type: integer
 *           minimum: 1
 *         stream:
 *           type: boolean
 *           default: false
 *     ChatCompletionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         object:
 *           type: string
 *           example: chat.completion
 *         created:
 *           type: integer
 *         model:
 *           type: string
 *         choices:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               index:
 *                 type: integer
 *               message:
 *                 type: object
 *                 properties:
 *                   role:
 *                     type: string
 *                     example: assistant
 *                   content:
 *                     type: string
 *               finish_reason:
 *                 type: string
 *                 nullable: true
 *         usage:
 *           type: object
 *           properties:
 *             prompt_tokens:
 *               type: integer
 *             completion_tokens:
 *               type: integer
 *             total_tokens:
 *               type: integer
 *
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered
 *
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user and create a session
 *     parameters:
 *       - in: header
 *         name: x-device-name
 *         schema:
 *           type: string
 *         description: Optional device label stored in the session table.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token and rotate refresh session
 *     parameters:
 *       - in: header
 *         name: x-device-name
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Token refreshed
 *
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       200:
 *         description: Logged out
 *
 * /api/v1/auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from all active sessions
 *     security:
 *       - UserBearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked
 *
 * /api/v1/models:
 *   get:
 *     tags: [Models]
 *     summary: Get all models
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Model list
 *
 * /api/v1/models/{id}:
 *   get:
 *     tags: [Models]
 *     summary: Get model by internal id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Model detail
 *
 * /api/v1/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Create API key
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApiKeyRequest'
 *     responses:
 *       201:
 *         description: API key created
 *   get:
 *     tags: [API Keys]
 *     summary: Get all API keys
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key list
 *
 * /api/v1/api-keys/{id}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API key by id
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key detail
 *   patch:
 *     tags: [API Keys]
 *     summary: Update API key
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateApiKeyRequest'
 *     responses:
 *       200:
 *         description: API key updated
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete API key
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deleted
 *
 * /api/v1/api-keys/project/{projectId}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API keys by project id
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project API keys
 *
 * /api/v1/api-keys/user/{userId}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API keys by user id
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User API keys
 *
 * /api/v1/wallets:
 *   post:
 *     tags: [Wallets]
 *     summary: Create wallet for current user
 *     security:
 *       - UserBearerAuth: []
 *     responses:
 *       201:
 *         description: Wallet created
 *
 * /api/v1/wallets/me:
 *   get:
 *     tags: [Wallets]
 *     summary: Get current user wallet
 *     security:
 *       - UserBearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet detail
 *
 * /api/v1/wallets/balance:
 *   get:
 *     tags: [Wallets]
 *     summary: Get current user wallet balance
 *     security:
 *       - UserBearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *
 * /api/v1/wallets/transactions:
 *   get:
 *     tags: [Wallets]
 *     summary: Get current user wallet transactions
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Wallet transaction list
 *
 * /api/v1/wallets/me/add-balance:
 *   post:
 *     tags: [Wallets]
 *     summary: Add balance to current user wallet
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AmountRequest'
 *     responses:
 *       200:
 *         description: Wallet credited
 *
 * /api/v1/wallets/add-balance:
 *   post:
 *     tags: [Wallets]
 *     summary: Admin add balance for any user
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletAdminAmountRequest'
 *     responses:
 *       200:
 *         description: Wallet credited
 *
 * /api/v1/wallets/deduct-balance:
 *   post:
 *     tags: [Wallets]
 *     summary: Admin deduct balance for any user
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletDeductRequest'
 *     responses:
 *       200:
 *         description: Wallet debited
 *
 * /api/v1/wallets/refund:
 *   post:
 *     tags: [Wallets]
 *     summary: Admin refund balance for any user
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletDeductRequest'
 *     responses:
 *       200:
 *         description: Wallet refunded
 *
 * /api/v1/wallets/freeze:
 *   post:
 *     tags: [Wallets]
 *     summary: Admin freeze wallet
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet frozen
 *
 * /api/v1/wallets/unfreeze:
 *   post:
 *     tags: [Wallets]
 *     summary: Admin unfreeze wallet
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet unfrozen
 *
 * /api/v1/providers:
 *   get:
 *     tags: [Providers]
 *     summary: Get all providers
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Provider list
 *   post:
 *     tags: [Providers]
 *     summary: Create provider
 *     security:
 *       - UserBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProviderRequest'
 *     responses:
 *       201:
 *         description: Provider created
 *
 * /api/v1/providers/{id}:
 *   get:
 *     tags: [Providers]
 *     summary: Get provider by id
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider detail
 *   patch:
 *     tags: [Providers]
 *     summary: Update provider
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProviderRequest'
 *     responses:
 *       200:
 *         description: Provider updated
 *   delete:
 *     tags: [Providers]
 *     summary: Delete provider
 *     security:
 *       - UserBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider deleted
 *
 * /api/v1/chat/completions:
 *   post:
 *     tags: [Chat Completions]
 *     summary: Create chat completion
 *     security:
 *       - ProjectApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatCompletionRequest'
 *     responses:
 *       200:
 *         description: OpenAI-compatible chat completion response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatCompletionResponse'
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 data: {"id":"chatcmpl_x","object":"chat.completion.chunk","created":1711111111,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}
 *
 *                 data: {"id":"chatcmpl_x","object":"chat.completion.chunk","created":1711111111,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}
 *
 *                 data: [DONE]
 *
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Root health check
 *     responses:
 *       200:
 *         description: Service health status
 *
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: API health check
 *     responses:
 *       200:
 *         description: Service health status
 */
export {};
