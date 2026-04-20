import { MongoClient, type Collection, type Db } from "mongodb";

interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
}

interface Channel {
  id: number;
  name: string;
  createdAt: Date;
}

interface Message {
  id: number;
  content: string;
  channelId: number;
  userId: number;
  createdAt: Date;
}

interface Counter {
  key: "users" | "channels" | "messages";
  seq: number;
}

class Store {
  private client: MongoClient;
  private db: Db | null = null;
  private usersCollection: Collection<User> | null = null;
  private channelsCollection: Collection<Channel> | null = null;
  private messagesCollection: Collection<Message> | null = null;
  private countersCollection: Collection<Counter> | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const uri = process.env["MONGODB_URI"];
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is required.");
    }
    this.client = new MongoClient(uri);
  }

  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await this.client.connect();

      const dbName = process.env["MONGODB_DB_NAME"] ?? "operation_runner";
      this.db = this.client.db(dbName);
      this.usersCollection = this.db.collection<User>("users");
      this.channelsCollection = this.db.collection<Channel>("channels");
      this.messagesCollection = this.db.collection<Message>("messages");
      this.countersCollection = this.db.collection<Counter>("counters");

      await this.usersCollection.createIndex({ id: 1 }, { unique: true });
      await this.usersCollection.createIndex({ username: 1 }, { unique: true });
      await this.channelsCollection.createIndex({ id: 1 }, { unique: true });
      await this.channelsCollection.createIndex({ name: 1 }, { unique: true });
      await this.messagesCollection.createIndex({ id: 1 }, { unique: true });
      await this.messagesCollection.createIndex({ channelId: 1, createdAt: 1 });
      await this.countersCollection.createIndex({ key: 1 }, { unique: true });

      await this.seedChannels();
      this.initialized = true;
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private get users(): Collection<User> {
    if (!this.usersCollection) {
      throw new Error("Store not initialized");
    }
    return this.usersCollection;
  }

  private get channels(): Collection<Channel> {
    if (!this.channelsCollection) {
      throw new Error("Store not initialized");
    }
    return this.channelsCollection;
  }

  private get messages(): Collection<Message> {
    if (!this.messagesCollection) {
      throw new Error("Store not initialized");
    }
    return this.messagesCollection;
  }

  private get counters(): Collection<Counter> {
    if (!this.countersCollection) {
      throw new Error("Store not initialized");
    }
    return this.countersCollection;
  }

  private async nextId(key: Counter["key"]): Promise<number> {
    const result = await this.counters.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    return result?.seq ?? 1;
  }

  private async seedChannels(): Promise<void> {
    const existingChannels = await this.channels.countDocuments();
    if (existingChannels > 0) {
      return;
    }

    const names = ["general", "random", "announcements", "gaming", "tech-talk"];
    const now = new Date();
    const docs: Channel[] = [];

    for (const name of names) {
      docs.push({
        id: await this.nextId("channels"),
        name,
        createdAt: now,
      });
    }

    await this.channels.insertMany(docs);
  }

  async findUserById(id: number): Promise<User | undefined> {
    await this.init();
    return (await this.users.findOne({ id })) ?? undefined;
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    await this.init();
    return (await this.users.findOne({ username })) ?? undefined;
  }

  async createUser(data: { username: string; displayName: string; avatarUrl?: string }): Promise<User> {
    await this.init();
    const user: User = {
      id: await this.nextId("users"),
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl ?? null,
      createdAt: new Date(),
    };
    await this.users.insertOne(user);
    return user;
  }

  async updateUser(id: number, data: { displayName: string }): Promise<User | undefined> {
    await this.init();
    await this.users.updateOne({ id }, { $set: { displayName: data.displayName } });
    return this.findUserById(id);
  }

  async listChannels(): Promise<Channel[]> {
    await this.init();
    return this.channels.find({}).sort({ createdAt: 1 }).toArray();
  }

  async findChannelById(id: number): Promise<Channel | undefined> {
    await this.init();
    return (await this.channels.findOne({ id })) ?? undefined;
  }

  async createChannel(name: string): Promise<Channel> {
    await this.init();
    const channel: Channel = {
      id: await this.nextId("channels"),
      name,
      createdAt: new Date(),
    };
    await this.channels.insertOne(channel);
    return channel;
  }

  async listMessages(
    channelId: number,
  ): Promise<Array<Message & { username: string; displayName: string; avatarUrl: string | null }>> {
    await this.init();

    const messages = await this.messages.find({ channelId }).sort({ createdAt: 1 }).toArray();
    if (messages.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(messages.map((m) => m.userId)));
    const users = await this.users.find({ id: { $in: userIds } }).toArray();
    const userMap = new Map(users.map((u) => [u.id, u]));

    return messages.map((m) => {
      const user = userMap.get(m.userId);
      return {
        ...m,
        username: user?.username ?? "Unknown",
        displayName: user?.displayName ?? "Unknown",
        avatarUrl: user?.avatarUrl ?? null,
      };
    });
  }

  async createMessage(data: { content: string; channelId: number; userId: number }): Promise<Message> {
    await this.init();
    const msg: Message = {
      id: await this.nextId("messages"),
      content: data.content,
      channelId: data.channelId,
      userId: data.userId,
      createdAt: new Date(),
    };
    await this.messages.insertOne(msg);
    return msg;
  }
}

export const store = new Store();
