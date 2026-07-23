import React from "react";
import PhonePortalUsage from "./PhonePortalUsage";
import PhoneVendorCalls from "./PhoneVendorCalls";

export default function PhoneNumbers({ user }) {
  return (
    <div className="space-y-8">
      <PhonePortalUsage user={user} />
      <div className="border-t border-border pt-8">
        <PhoneVendorCalls user={user} />
      </div>
    </div>
  );
}
