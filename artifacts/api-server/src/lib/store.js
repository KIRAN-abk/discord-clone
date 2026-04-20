import { MongoClient } from "mongodb";

class Store {
  constructor() {
    const uri = process.env["MONGODB_URI"];
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is required.");
    }
    this.client = new MongoClient(uri);
    this.db = null;
    this.usersCollection = null;
    this.channelsCollection = null;
    this.messagesCollection = null;
    this.countersCollection = null;
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await this.client.connect();

      const dbName = process.env["MONGODB_DB_NAME"] ?? "discord-clone";
      this.db = this.client.db(dbName);
      this.usersCollection = this.db.collection("users");
      this.channelsCollection = this.db.collection("channels");
      this.messagesCollection = this.db.collection("messages");
      this.countersCollection = this.db.collection("counters");

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

  get users() {
    if (!this.usersCollection) {
      throw new Error("Store not initialized");
    }
    return this.usersCollection;
  }

  get channels() {
    if (!this.channelsCollection) {
      throw new Error("Store not initialized");
    }
    return this.channelsCollection;
  }

  get messages() {
    if (!this.messagesCollection) {
      throw new Error("Store not initialized");
    }
    return this.messagesCollection;
  }

  get counters() {
    if (!this.countersCollection) {
      throw new Error("Store not initialized");
    }
    return this.countersCollection;
  }

  async nextId(key) {
    const result = await this.counters.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    return result?.seq ?? 1;
  }

  async seedChannels() {
    const existingChannels = await this.channels.countDocuments();
    if (existingChannels > 0) {
      return;
    }

    const names = ["general", "random", "announcements", "gaming", "tech-talk"];
    const now = new Date();
    const docs = [];

    for (const name of names) {
      docs.push({
        id: await this.nextId("channels"),
        name,
        createdAt: now,
      });
    }

    await this.channels.insertMany(docs);
  }

  async findUserById(id) {
    await this.init();
    return (await this.users.findOne({ id })) ?? undefined;
  }

  async findUserByUsername(username) {
    await this.init();
    return (await this.users.findOne({ username })) ?? undefined;
  }

  async createUser(data) {
    await this.init();
    const user = {
      id: await this.nextId("users"),
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl ?? null,
      createdAt: new Date(),
    };
    await this.users.insertOne(user);
    return user;
  }

  async updateUser(id, data) {
    await this.init();
    await this.users.updateOne({ id }, { $set: { displayName: data.displayName } });
    return this.findUserById(id);
  }

  async listChannels() {
    await this.init();
    return this.channels.find({}).sort({ createdAt: 1 }).toArray();
  }

  async findChannelById(id) {
    await this.init();
    return (await this.channels.findOne({ id })) ?? undefined;
  }

  async createChannel(name) {
    await this.init();
    const channel = {
      id: await this.nextId("channels"),
      name,
      createdAt: new Date(),
    };
    await this.channels.insertOne(channel);
    return channel;
  }

  async listMessages(channelId) {
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

  async createMessage(data) {
    await this.init();
    const msg = {
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
