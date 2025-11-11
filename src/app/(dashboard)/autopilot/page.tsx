"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AutoPilotRulesList } from "@/components/features/rules/autopilot-rules-list"
import { RuleBuilderModal } from "@/components/features/rules/rule-builder-modal"
import type { BuiltRule } from "@/components/features/rules/rule-builder-modal"

export default function AutoPilotPage() {
  const [showBuilder, setShowBuilder] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRuleSaved = (rule: BuiltRule) => {
    console.log('Rule created:', rule)
    // Trigger refresh of rules list
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AutoPilot Trading</h1>
          <p className="text-muted-foreground mt-2">
            Automate your trading strategy with smart rules on Algorand
          </p>
        </div>
        <RuleBuilderModal
          open={showBuilder}
          onOpenChange={setShowBuilder}
          trigger={
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          }
          onSave={handleRuleSaved}
        />
      </div>

      <AutoPilotRulesList key={refreshKey} />
    </div>
  )
}
