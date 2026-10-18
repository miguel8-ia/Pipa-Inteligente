import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  InsertUser,
  users,
  communities,
  trucks,
  routes,
  supplyHistory,
  criticalNotifications,
  rankingJustifications,
  drivers,
  deliveries,
  deliveryConfirmations,
  InsertCommunity,
  InsertTruck,
  InsertRoute,
  InsertSupplyHistory,
  InsertCriticalNotification,
  InsertRankingJustification,
  InsertDriver,
  InsertDelivery,
  InsertDeliveryConfirmation,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    try {
      const sqlite = new Database(ENV.databaseUrl);
      sqlite.pragma("journal_mode = WAL");
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to open:", error);
    }
  }
  return _db;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = requireDb();
  const now = new Date().toISOString();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    values[field] = value ?? null;
    updateSet[field] = value ?? null;
  }

  const rawLastSignedIn = user.lastSignedIn as Date | string | null | undefined;
  const lastSignedIn = rawLastSignedIn instanceof Date ? rawLastSignedIn.toISOString() : rawLastSignedIn;
  if (lastSignedIn != null) {
    values.lastSignedIn = lastSignedIn;
    updateSet.lastSignedIn = lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = now;
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = now;

  try {
    db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet }).run();
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export function getUserByOpenId(openId: string) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(users).where(eq(users.openId, openId)).limit(1).all()[0];
}

// Communities
export function createCommunity(data: InsertCommunity) {
  return requireDb().insert(communities).values(data).run();
}

export function getAllCommunities() {
  return requireDb().select().from(communities).orderBy(communities.priority).all();
}

export function getCommunityById(id: number) {
  return requireDb().select().from(communities).where(eq(communities.id, id)).all()[0];
}

export function updateCommunity(id: number, data: Partial<InsertCommunity>) {
  requireDb().update(communities).set(data).where(eq(communities.id, id)).run();
}

export function deleteCommunity(id: number) {
  requireDb().delete(communities).where(eq(communities.id, id)).run();
}

// Trucks
export function createTruck(data: InsertTruck) {
  return requireDb().insert(trucks).values(data).run();
}

export function getAllTrucks() {
  return requireDb().select().from(trucks).all();
}

export function getTruckById(id: number) {
  return requireDb().select().from(trucks).where(eq(trucks.id, id)).all()[0];
}

export function updateTruck(id: number, data: Partial<InsertTruck>) {
  requireDb().update(trucks).set(data).where(eq(trucks.id, id)).run();
}

// Routes
export function createRoute(data: InsertRoute) {
  return requireDb().insert(routes).values(data).run();
}

export function getRoutesByTruck(truckId: number) {
  return requireDb().select().from(routes).where(eq(routes.truckId, truckId)).all();
}

export function updateRoute(id: number, data: Partial<InsertRoute>) {
  requireDb().update(routes).set(data).where(eq(routes.id, id)).run();
}

// Supply History
export function createSupplyRecord(data: InsertSupplyHistory) {
  return requireDb().insert(supplyHistory).values(data).run();
}

export function getSupplyHistoryByCommunity(communityId: number) {
  return requireDb().select().from(supplyHistory).where(eq(supplyHistory.communityId, communityId)).all();
}

// Critical Notifications
export function createCriticalNotification(data: InsertCriticalNotification) {
  return requireDb().insert(criticalNotifications).values(data).run();
}

export function getCriticalNotifications() {
  return requireDb().select().from(criticalNotifications).where(eq(criticalNotifications.isRead, 0)).all();
}

// Ranking Justifications
export function createRankingJustification(data: InsertRankingJustification) {
  return requireDb().insert(rankingJustifications).values(data).run();
}

export function getRankingJustification(communityId: number) {
  return requireDb().select().from(rankingJustifications).where(eq(rankingJustifications.communityId, communityId)).all()[0];
}

// Motoristas
export function createDriver(driver: InsertDriver) {
  return requireDb().insert(drivers).values(driver).run();
}

export function getDriverById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(drivers).where(eq(drivers.id, id)).limit(1).all()[0];
}

export function getAllDrivers() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(drivers).all();
}

export function updateDriver(id: number, data: Partial<InsertDriver>) {
  return requireDb().update(drivers).set(data).where(eq(drivers.id, id)).run();
}

export function updateDriverLocation(id: number, lat: number, lng: number) {
  requireDb().update(drivers).set({ currentLatitude: lat, currentLongitude: lng }).where(eq(drivers.id, id)).run();
}

// Entregas
export function createDelivery(delivery: InsertDelivery) {
  return requireDb().insert(deliveries).values(delivery).run();
}

export function getDeliveryById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1).all()[0];
}

export function getDeliveriesByRoute(routeId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(eq(deliveries.routeId, routeId)).all();
}

export function getDeliveriesByDriver(driverId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(eq(deliveries.driverId, driverId)).all();
}

export function updateDelivery(id: number, data: Partial<InsertDelivery>) {
  return requireDb().update(deliveries).set(data).where(eq(deliveries.id, id)).run();
}

// Confirmações de entrega
export function createDeliveryConfirmation(confirmation: InsertDeliveryConfirmation) {
  return requireDb().insert(deliveryConfirmations).values(confirmation).run();
}

export function getDeliveryConfirmation(deliveryId: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(deliveryConfirmations).where(eq(deliveryConfirmations.deliveryId, deliveryId)).limit(1).all()[0];
}
