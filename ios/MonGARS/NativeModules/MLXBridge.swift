import Foundation
import os.log

#if canImport(MLX)
  import MLX
#endif

#if canImport(MLXLLM)
  import MLXLLM
#endif

#if canImport(MLXLMCommon)
  import MLXLMCommon
#endif

#if canImport(MLXVLM)
  import MLXVLM
#endif

@preconcurrency import Hub

private let logger = Logger(subsystem: "com.mongars.mlx", category: "bridge")
private let generationCancelledCode = -9_999

@objcMembers
final class MLXModelLoadProgress: NSObject {
  let fractionCompleted: Double
  let stage: String
  let message: String?

  init(fractionCompleted: Double, stage: String, message: String?) {
    self.fractionCompleted = fractionCompleted
    self.stage = stage
    self.message = message
  }
}

@objcMembers
final class MLXGeneratedToken: NSObject {
  let value: String?
  let index: Int
  let sessionId: String?

  init(value: String?, index: Int, sessionId: String?) {
    self.value = value
    self.index = index
    self.sessionId = sessionId
  }
}

private struct MLXModelDescriptor {
  let identifier: String
  let name: String
  let size: String
  let description: String
  let configuration: ModelConfiguration
  let isVision: Bool
}

private final class MLXChatSession {
  let id: String
  let modelId: String
  var systemPrompt: String?
  var summary: String?
  var messages: [Chat.Message]
  var timestamps: [Date]

  init(id: String, modelId: String, systemPrompt: String?) {
    self.id = id
    self.modelId = modelId
    self.systemPrompt = systemPrompt
    self.summary = nil
    self.messages = []
    self.timestamps = []

    if let systemPrompt, !systemPrompt.isEmpty {
      let systemMessage = Chat.Message(role: .system, content: systemPrompt)
      messages.append(systemMessage)
      timestamps.append(Date())
    }
  }

  func append(role: Chat.Message.Role, content: String) {
    messages.append(Chat.Message(role: role, content: content))
    timestamps.append(Date())
  }

  func historyPayload() -> [NSDictionary] {
    var payload: [NSDictionary] = []
    for (index, message) in messages.enumerated() {
      let role: String
      switch message.role {
      case .assistant:
        role = "assistant"
      case .user:
        role = "user"
      case .system:
        role = "system"
      }

      let timestamp = timestamps.indices.contains(index) ? timestamps[index].timeIntervalSince1970 : Date().timeIntervalSince1970
      payload.append([
        "role": role,
        "content": message.content,
        "timestamp": timestamp
      ])
    }
    return payload
  }
}

@objcMembers
final class MLXBridge: NSObject {
  static let shared = MLXBridge()

  private var modelCache: [String: ModelContainer] = [:]
  private var sessions: [String: MLXChatSession] = [:]
  private var activeTasks: [UUID: Task<Void, Never>] = [:]

  private override init() {
    super.init()
  }

  private lazy var hubApi: HubApi = {
    #if os(macOS)
      return HubApi(downloadBase: URL.downloadsDirectory.appending(path: "huggingface"))
    #else
      return HubApi(downloadBase: URL.cachesDirectory.appending(path: "huggingface"))
    #endif
  }()

  private lazy var modelDescriptors: [String: MLXModelDescriptor] = {
    var index: [String: MLXModelDescriptor] = [:]

    #if canImport(MLXLLM)
      index["mlx-community/Qwen2.5-0.5B-Instruct-4bit"] = MLXModelDescriptor(
        identifier: "mlx-community/Qwen2.5-0.5B-Instruct-4bit",
        name: "Qwen2.5 0.5B Instruct",
        size: "0.45 GB",
        description: "Fast and memory efficient assistant tuned for mobile.",
        configuration: LLMRegistry.qwen2_5_0_5b,
        isVision: false
      )

      index["mlx-community/Qwen2.5-1.5B-Instruct-4bit"] = MLXModelDescriptor(
        identifier: "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
        name: "Qwen2.5 1.5B Instruct",
        size: "1.1 GB",
        description: "Balanced quality and speed with instruction tuning.",
        configuration: LLMRegistry.qwen2_5_1_5b,
        isVision: false
      )

      index["mlx-community/Llama-3.2-1B-Instruct-4bit"] = MLXModelDescriptor(
        identifier: "mlx-community/Llama-3.2-1B-Instruct-4bit",
        name: "Llama 3.2 1B Instruct",
        size: "0.9 GB",
        description: "Meta's compact 1B assistant model optimized for MLX.",
        configuration: LLMRegistry.llama3_2_1B_4bit,
        isVision: false
      )

      index["mlx-community/Llama-3.2-3B-Instruct-4bit"] = MLXModelDescriptor(
        identifier: "mlx-community/Llama-3.2-3B-Instruct-4bit",
        name: "Llama 3.2 3B Instruct",
        size: "2.1 GB",
        description: "Higher quality assistant with deeper reasoning abilities.",
        configuration: LLMRegistry.llama3_2_3B_4bit,
        isVision: false
      )

      index["mlx-community/Qwen2.5-3B-Instruct-4bit"] = MLXModelDescriptor(
        identifier: "mlx-community/Qwen2.5-3B-Instruct-4bit",
        name: "Qwen2.5 3B Instruct",
        size: "2.2 GB",
        description: "Premium 3B assistant tuned for code and reasoning.",
        configuration: LLMRegistry.qwen2_5_3b,
        isVision: false
      )
    #endif

    return index
  }()

  private func register(task: Task<Void, Never>, key: UUID) {
    if Thread.isMainThread {
      activeTasks[key] = task
    } else {
      DispatchQueue.main.async { [weak self] in
        self?.activeTasks[key] = task
      }
    }
  }

  private func completeTask(for key: UUID) {
    if Thread.isMainThread {
      activeTasks.removeValue(forKey: key)
    } else {
      DispatchQueue.main.async { [weak self] in
        self?.activeTasks.removeValue(forKey: key)
      }
    }
  }

  private func cancellationError() -> NSError {
    NSError(
      domain: "com.mongars.mlx",
      code: generationCancelledCode,
      userInfo: [NSLocalizedDescriptionKey: "Generation cancelled"]
    )
  }

  func stopAllGenerations() {
    let tasksToCancel: [Task<Void, Never>]

    if Thread.isMainThread {
      tasksToCancel = Array(activeTasks.values)
      activeTasks.removeAll()
    } else {
      var snapshot: [Task<Void, Never>] = []
      DispatchQueue.main.sync { [weak self] in
        guard let self else { return }
        snapshot = Array(self.activeTasks.values)
        self.activeTasks.removeAll()
      }
      tasksToCancel = snapshot
    }

    for task in tasksToCancel {
      task.cancel()
    }
  }

  private func descriptor(for modelId: String) -> MLXModelDescriptor? {
    if let descriptor = modelDescriptors[modelId] {
      return descriptor
    }
    return modelDescriptors.values.first(where: { $0.identifier.caseInsensitiveCompare(modelId) == .orderedSame || $0.identifier.lowercased() == modelId.lowercased() })
  }

  private func ensureModelLoaded(_ modelId: String,
                                 options: NSDictionary?,
                                 progressBlock: ((MLXModelLoadProgress) -> Void)?) async throws -> ModelContainer {
    if let cached = modelCache[modelId] {
      return cached
    }

    guard let descriptor = descriptor(for: modelId) else {
      throw NSError(domain: "com.mongars.mlx", code: 404, userInfo: [NSLocalizedDescriptionKey: "Unsupported MLX model identifier \(modelId)"])
    }

    #if !canImport(MLXLLM)
      throw NSError(domain: "com.mongars.mlx", code: 503, userInfo: [NSLocalizedDescriptionKey: "MLXLLM package not linked. Ensure MLX Swift dependencies are installed."])
    #else
      logger.log("Loading MLX model %{public}@", descriptor.identifier)

      let factory: ModelFactory = descriptor.isVision ? VLMModelFactory.shared : LLMModelFactory.shared

      let container = try await factory.loadContainer(
        hub: hubApi,
        configuration: descriptor.configuration
      ) { progress in
        let fraction = progress.totalUnitCount > 0 ? Double(progress.completedUnitCount) / Double(progress.totalUnitCount) : 0
        progressBlock?(MLXModelLoadProgress(
          fractionCompleted: fraction,
          stage: progress.localizedDescription,
          message: progress.localizedAdditionalDescription
        ))
      }

      modelCache[modelId] = container
      return container
    #endif
  }

  private func applyMemoryCompression(to session: MLXChatSession) {
    let maxMessages = 12
    guard session.messages.count > maxMessages else {
      return
    }

    let retained = session.messages.suffix(maxMessages)
    session.messages = Array(retained)
    if session.timestamps.count > maxMessages {
      session.timestamps = Array(session.timestamps.suffix(maxMessages))
    }
  }

  private func parameters(from options: NSDictionary?) -> GenerateParameters {
    let temperature = options?["temperature"] as? Double ?? 0.7
    let topP = options?["topP"] as? Double ?? 0.9
    let topK = options?["topK"] as? Int ?? 40
    let repeatPenalty = options?["repeatPenalty"] as? Double ?? 1.1
    let maxTokens = options?["maxTokens"] as? Int ?? 512

    return GenerateParameters(
      temperature: temperature,
      topP: topP,
      topK: topK,
      repeatPenalty: repeatPenalty,
      maxTokens: maxTokens
    )
  }

  func loadModel(withId modelId: String,
                 options: NSDictionary?,
                 progressBlock: ((MLXModelLoadProgress) -> Void)? = nil,
                 resolve: @escaping (NSDictionary) -> Void,
                 reject: @escaping (NSError) -> Void) {
    Task.detached(priority: .userInitiated) {
      do {
        let alreadyLoaded = self.modelCache[modelId] != nil
        _ = try await self.ensureModelLoaded(modelId, options: options, progressBlock: progressBlock)
        resolve(["modelId": modelId, "cached": alreadyLoaded])
      } catch {
        logger.error("Failed to load MLX model %{public}@ %{public}@", modelId, error.localizedDescription)
        reject(error as NSError)
      }
    }
  }

  func generate(withModelId modelId: String,
                prompt: String,
                options: NSDictionary?,
                onToken: ((MLXGeneratedToken) -> Void)?,
                onComplete: @escaping (NSDictionary) -> Void,
                reject: @escaping (NSError) -> Void) {
    let taskId = UUID()
    let generationTask = Task.detached(priority: .userInitiated) { [weak self] in
      guard let self else { return }

      defer { self.completeTask(for: taskId) }

      do {
        let container = try await self.ensureModelLoaded(modelId, options: options, progressBlock: nil)
        let parameters = self.parameters(from: options)

        try Task.checkCancellation()

        let start = Date()
        var collected = ""
        var totalTokens = 0

        try await container.perform { (context: ModelContext) in
          let chat = [Chat.Message(role: .user, content: prompt)]
          let userInput = UserInput(chat: chat)
          let prepared = try await context.processor.prepare(input: userInput)
          let stream = try MLXLMCommon.generate(input: prepared, parameters: parameters, context: context)

          for try await generation in stream {
            try Task.checkCancellation()

            switch generation {
            case .chunk(let chunk):
              collected += chunk
              totalTokens += 1
              onToken?(MLXGeneratedToken(value: chunk, index: totalTokens - 1, sessionId: nil))
            case .info(let info):
              totalTokens = info.generatedTokens
            case .toolCall:
              break
            }
          }
        }

        try Task.checkCancellation()

        let elapsed = Date().timeIntervalSince(start) * 1000
        let payload: NSDictionary = [
          "text": collected,
          "tokensGenerated": totalTokens,
          "timeElapsed": elapsed
        ]

        DispatchQueue.main.async {
          onComplete(payload)
        }
      } catch is CancellationError {
        let cancelError = self.cancellationError()
        DispatchQueue.main.async {
          reject(cancelError)
        }
      } catch {
        DispatchQueue.main.async {
          reject(error as NSError)
        }
      }
    }

    register(task: generationTask, key: taskId)
  }

  func createSession(withModelId modelId: String,
                     sessionId: String,
                     systemPrompt: String?,
                     resolve: @escaping () -> Void,
                     reject: @escaping (NSError) -> Void) {
    Task.detached(priority: .userInitiated) {
      do {
        _ = try await self.ensureModelLoaded(modelId, options: nil, progressBlock: nil)
        let session = MLXChatSession(id: sessionId, modelId: modelId, systemPrompt: systemPrompt)
        self.sessions[sessionId] = session
        resolve()
      } catch {
        reject(error as NSError)
      }
    }
  }

  func respond(toSessionWithId sessionId: String,
               message: String,
               options: NSDictionary?,
               onToken: ((MLXGeneratedToken) -> Void)?,
               onComplete: @escaping (NSDictionary) -> Void,
               reject: @escaping (NSError) -> Void) {
    let taskId = UUID()
    let respondTask = Task.detached(priority: .userInitiated) { [weak self] in
      guard let self else { return }

      defer { self.completeTask(for: taskId) }

      guard let session = self.sessions[sessionId] else {
        DispatchQueue.main.async {
          reject(NSError(domain: "com.mongars.mlx", code: 404, userInfo: [NSLocalizedDescriptionKey: "Chat session not found"]))
        }
        return
      }

      do {
        let container = try await self.ensureModelLoaded(session.modelId, options: options, progressBlock: nil)
        let parameters = self.parameters(from: options)

        try Task.checkCancellation()

        session.append(role: .user, content: message)
        self.applyMemoryCompression(to: session)

        let start = Date()
        var collected = ""
        var totalTokens = 0

        try await container.perform { (context: ModelContext) in
          let userInput = UserInput(chat: session.messages)
          let prepared = try await context.processor.prepare(input: userInput)
          let stream = try MLXLMCommon.generate(input: prepared, parameters: parameters, context: context)

          for try await generation in stream {
            try Task.checkCancellation()

            switch generation {
            case .chunk(let chunk):
              collected += chunk
              totalTokens += 1
              onToken?(MLXGeneratedToken(value: chunk, index: totalTokens - 1, sessionId: sessionId))
            case .info(let info):
              totalTokens = info.generatedTokens
            case .toolCall:
              break
            }
          }
        }

        try Task.checkCancellation()

        session.append(role: .assistant, content: collected)

        let elapsed = Date().timeIntervalSince(start) * 1000
        let payload: NSDictionary = [
          "text": collected,
          "tokensGenerated": totalTokens,
          "timeElapsed": elapsed
        ]

        DispatchQueue.main.async {
          onComplete(payload)
        }
      } catch is CancellationError {
        session.messages.removeLast()
        if session.timestamps.count > 0 {
          session.timestamps.removeLast()
        }

        let cancelError = self.cancellationError()
        DispatchQueue.main.async {
          reject(cancelError)
        }
      } catch {
        DispatchQueue.main.async {
          reject(error as NSError)
        }
      }
    }

    register(task: respondTask, key: taskId)
  }

  func getHistory(forSession sessionId: String,
                  resolve: @escaping ([NSDictionary]) -> Void,
                  reject: @escaping (NSError) -> Void) {
    if let session = sessions[sessionId] {
      resolve(session.historyPayload())
    } else {
      reject(NSError(domain: "com.mongars.mlx", code: 404, userInfo: [NSLocalizedDescriptionKey: "Chat session not found"]))
    }
  }

  func clearHistory(forSession sessionId: String,
                    resolve: @escaping () -> Void,
                    reject: @escaping (NSError) -> Void) {
    guard let session = sessions[sessionId] else {
      reject(NSError(domain: "com.mongars.mlx", code: 404, userInfo: [NSLocalizedDescriptionKey: "Chat session not found"]))
      return
    }

    let systemPrompt = session.systemPrompt
    let newSession = MLXChatSession(id: sessionId, modelId: session.modelId, systemPrompt: systemPrompt)
    sessions[sessionId] = newSession
    resolve()
  }

  func unloadModel(withId modelId: String,
                   resolve: @escaping (Int) -> Void,
                   reject: @escaping (NSError) -> Void) {
    modelCache.removeValue(forKey: modelId)

    var closedSessions = 0
    sessions = sessions.filter { _, session in
      if session.modelId == modelId {
        closedSessions += 1
        return false
      }
      return true
    }
    resolve(closedSessions)
  }

  func recommendedModels(_ resolve: @escaping (NSDictionary) -> Void,
                         reject: @escaping (NSError) -> Void) {
    let process = ProcessInfo.processInfo
    let memoryGB = Double(process.physicalMemory) / (1024.0 * 1024.0 * 1024.0)

    var recommended: [NSDictionary] = []

    for descriptor in modelDescriptors.values {
      let entry: NSDictionary = [
        "id": descriptor.identifier,
        "name": descriptor.name,
        "size": descriptor.size,
        "description": descriptor.description
      ]

      if memoryGB >= 6 && descriptor.identifier.contains("3B") {
        recommended.append(entry)
      } else if memoryGB >= 4 && descriptor.identifier.contains("1.5B") {
        recommended.append(entry)
      } else if memoryGB >= 2 && descriptor.identifier.contains("0.5B") {
        recommended.append(entry)
      }

      if descriptor.identifier.contains("1B") {
        recommended.append(entry)
      }
    }

    if recommended.isEmpty {
      recommended = modelDescriptors.values.map { descriptor in
        [
          "id": descriptor.identifier,
          "name": descriptor.name,
          "size": descriptor.size,
          "description": descriptor.description
        ]
      }
    }

    resolve([
      "deviceMemoryGB": memoryGB,
      "recommended": recommended
    ])
  }

  func memoryStatistics(_ resolve: @escaping (NSDictionary) -> Void,
                        reject: @escaping (NSError) -> Void) {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4
    let result = withUnsafeMutablePointer(to: &info) { pointer in
      pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { reboundPointer in
        task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), reboundPointer, &count)
      }
    }

    guard result == KERN_SUCCESS else {
      reject(NSError(domain: "com.mongars.mlx", code: Int(result), userInfo: [NSLocalizedDescriptionKey: "Unable to read memory statistics"]))
      return
    }

    let usedMB = Double(info.resident_size) / (1024.0 * 1024.0)
    let totalGB = Double(ProcessInfo.processInfo.physicalMemory) / (1024.0 * 1024.0 * 1024.0)

    resolve([
      "usedMemoryMB": usedMB,
      "totalMemoryGB": totalGB,
      "modelsLoaded": modelCache.count,
      "activeSessions": sessions.count
    ])
  }
}

