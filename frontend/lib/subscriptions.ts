import { api } from "./axios";
import Mongoose from "mongoose";

export interface Subscription {
  _id: string;
  subscribedAt: Date;
  expiresAt: Date;
  interval: 1 | 12;
  status: "active" | "canceled";
  user_id: string;
}

export interface Card {
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: number;
}

export interface CardResponse {
  cardHolderName: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

interface SubscriptionResponse extends Omit<Subscription, "_id"> {
  _id: Mongoose.Types.ObjectId;
}

export const subscribe = async ({
  card,
  interval,
  user_id,
}: {
  card: Card;
  interval: 1 | 12;
  user_id: string;
}): Promise<SubscriptionResponse> => {
  const response = await api.post<SubscriptionResponse>(`/subscriptions/`, {
    subscription: {
      user_id,
      interval,
    },
    card,
  });

  if (response.status !== 200 || !response.data)
    throw new Error("Invalid subscription");

  const subscription = {
    _id: response.data._id,
    subscribedAt: response.data.subscribedAt,
    expiresAt: response.data.expiresAt,
    interval: response.data.interval,
    status: response.data.status,
    user_id: response.data.user_id,
  };

  return subscription;
};

export const cancel = async (
  user_id: string,
): Promise<SubscriptionResponse> => {
  const response = await api.put<SubscriptionResponse>(
    `/subscriptions/${user_id}/cancel`,
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Invalid subscription");

  const subscription = {
    _id: response.data._id,
    subscribedAt: response.data.subscribedAt,
    expiresAt: response.data.expiresAt,
    interval: response.data.interval,
    status: response.data.status,
    user_id: response.data.user_id,
  };

  return subscription;
};

export const getSubscription = async (
  user_id: string,
): Promise<SubscriptionResponse> => {
  const response = await api.get<SubscriptionResponse>(
    `/subscriptions/${user_id}`,
  );

  if (response.status !== 201 || !response.data)
    throw new Error("Invalid subscription");

  const subscription = {
    _id: response.data._id,
    subscribedAt: response.data.subscribedAt,
    expiresAt: response.data.expiresAt,
    interval: response.data.interval,
    status: response.data.status,
    user_id: response.data.user_id,
  };

  return subscription;
};

export const updateSubscription = async ({
  user_id,
  interval,
}: {
  user_id: string;
  interval: 1 | 12;
}) => {
  const response = await api.put<SubscriptionResponse>(
    `/subscriptions/${user_id}`,
    {
      interval,
    },
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Invalid subscription");
};

export const getCard = async (user_id: string): Promise<CardResponse> => {
  const response = await api.get<CardResponse>(
    `/subscriptions/${user_id}/card`,
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Invalid card");

  return response.data;
};

export const updateCard = async ({
  user_id,
  card,
}: {
  user_id: string;
  card: Card;
}): Promise<CardResponse> => {
  const response = await api.put<CardResponse>(
    `/subscriptions/${user_id}/card`,
    card,
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Invalid card");

  return response.data;
};
