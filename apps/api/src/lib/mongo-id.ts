import { ObjectId } from "mongodb";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const toObjectId = (value: string): ObjectId | null => {
  if (!OBJECT_ID_REGEX.test(value)) {
    return null;
  }

  return new ObjectId(value);
};
