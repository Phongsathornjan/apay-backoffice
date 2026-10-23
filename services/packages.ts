import type {
  CreatePackageRequest,
  DeletePackageData,
  Package,
  UpdatePackageRequest,
} from "@/types/api";
import { apiRequest } from "@/services/api";

export function listPackages(onlyActive?: boolean): Promise<Package[]> {
  return apiRequest<Package[]>("/packages", {
    query:
      onlyActive === undefined ? undefined : { only_active: onlyActive ? "true" : "false" },
  });
}

export function getPackage(id: string): Promise<Package> {
  return apiRequest<Package>(`/packages/${id}`);
}

export function createPackage(payload: CreatePackageRequest): Promise<Package> {
  return apiRequest<Package>("/packages", { method: "POST", body: payload });
}

export function updatePackage(id: string, payload: UpdatePackageRequest): Promise<Package> {
  return apiRequest<Package>(`/packages/${id}`, { method: "PATCH", body: payload });
}

export function deletePackage(id: string): Promise<DeletePackageData> {
  return apiRequest<DeletePackageData>(`/packages/${id}`, { method: "DELETE" });
}
