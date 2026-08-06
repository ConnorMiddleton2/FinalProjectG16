import type { OwnerApplicationProperty } from "@/lib/owner-application-intake";
import {
  propertyLocationLabel,
  propertySfLabel,
} from "@/lib/owner-application-intake";

export function OwnerApplicationPropertySummary({
  property,
  dense = false,
}: {
  property: OwnerApplicationProperty;
  dense?: boolean;
}) {
  const metrics = [
    property.occupancyPercent
      ? `${property.occupancyPercent}% occ`
      : null,
    property.monthlyRentRoll
      ? `$${Number(property.monthlyRentRoll).toLocaleString()} / mo rent`
      : null,
    property.tenantCount ? `${property.tenantCount} tenants` : null,
    propertySfLabel(property) || null,
    property.camOrNnnStructure || null,
  ].filter(Boolean);

  if (dense) {
    return (
      <div className="text-sm">
        <p className="font-medium">{propertyLocationLabel(property)}</p>
        <p className="opacity-65">
          {[
            property.category,
            ...metrics.slice(0, 3),
          ]
            .filter(Boolean)
            .join(" · ") || "Details pending"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3 text-sm">
      <div>
        <p className="font-semibold text-[var(--harbor-ink)]">
          {property.propertyName || propertyLocationLabel(property)}
        </p>
        <p className="owner-muted text-xs capitalize">
          {[
            property.category,
            [property.streetAddress, property.city, property.state, property.zip]
              .filter(Boolean)
              .join(", ") || property.location,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {metrics.length > 0 ? (
        <p className="text-xs opacity-75">{metrics.join(" · ")}</p>
      ) : null}
      {property.reasonForChange ? (
        <p className="text-xs italic opacity-70">
          Why Harborline: {property.reasonForChange}
        </p>
      ) : null}
      {property.servicesRequested?.length ? (
        <p className="text-xs opacity-70">
          Services: {property.servicesRequested.join(", ")}
        </p>
      ) : null}
      {property.knownIssues ? (
        <p className="text-xs opacity-70">Issues: {property.knownIssues}</p>
      ) : null}
    </div>
  );
}
