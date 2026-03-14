/**
 * Share Links Management Tab
 *
 * Allows users to view and manage their share tokens with:
 * - View count tracking
 * - Creation date display
 * - Revoke/delete functionality
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

interface ShareToken {
  token: string;
  entityUid: string;
  shareType: string;
  title?: string;
  description?: string;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  isRevoked: boolean;
  shareUrl: string;
  createdBy?: string; // For admin view
}

export function ShareLinksManagementTab() {
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const getToken = async (_opts?: any) => "mock-token";
  const { toast } = useToast();
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  const checkAdminStatus = async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) return;

      // Try to access admin endpoint to check admin status
      const response = await fetch(`/api/share/user/all/tokens`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setIsAdmin(response.status !== 403);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  // Fetch share tokens (user's own or all if admin)
  const fetchShareTokens = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get Clerk session token for authentication
      const token = await getToken();
      if (!token) {
        setError("Authentication token not available");
        return;
      }

      // Use admin view if toggled and user is admin
      const targetUserId = isAdmin && isAdminView ? "all" : user.id;

      const response = await fetch(`/api/share/user/${targetUserId}/tokens`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        setShareTokens(data.tokens || []);
      } else {
        setError(data.error || "Failed to load share tokens");
      }
    } catch (error) {
      console.error("Failed to fetch share tokens:", error);
      setError("Failed to load share tokens");
    } finally {
      setLoading(false);
    }
  };

  // Revoke a share token
  const revokeToken = async (token: string) => {
    try {
      // Get Clerk session token for authentication
      const authToken = await getToken();
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Authentication token not available",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/share/${token}/revoke`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Share link revoked",
          description: "The share link has been revoked successfully",
        });

        // Refresh the list
        fetchShareTokens();
      } else {
        toast({
          title: "Failed to revoke",
          description: data.error || "Failed to revoke share link",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to revoke token:", error);
      toast({
        title: "Error",
        description: "Failed to revoke share link",
        variant: "destructive",
      });
    }
  };

  // Copy share URL to clipboard
  const copyShareUrl = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkAdminStatus();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchShareTokens();
    }
  }, [user?.id, isAdminView]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share Links Management</CardTitle>
          <CardDescription>Loading your share links...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share Links Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-error/30 bg-error/10 p-4">
            <p className="text-sm text-error">{error}</p>
          </div>
          <Button onClick={fetchShareTokens} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Share Links Management
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant={isAdminView ? "default" : "outline"}
                onClick={() => setIsAdminView(!isAdminView)}
              >
                {isAdminView ? "User View" : "Admin View"}
              </Button>
            )}
            <Badge variant="secondary">{shareTokens.length} links</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          {isAdminView
            ? "Viewing all share links across all users (admin mode)"
            : "Manage your timeline share links, view statistics, and control access"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {shareTokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No share links yet
            </h3>
            <p className="text-sm">
              Create timeline share links from the Atlas to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {shareTokens.length} share link
                {shareTokens.length !== 1 ? "s" : ""}
                {isAdminView && " (all users)"}
              </div>
              <Button onClick={fetchShareTokens} variant="outline" size="sm">
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {shareTokens.map((shareToken) => (
                <Card key={shareToken.token} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {shareToken.title ||
                              `${shareToken.entityUid} Timeline`}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {shareToken.entityUid}
                          </div>
                          {isAdminView && shareToken.createdBy && (
                            <div className="text-xs text-warning mt-1 font-medium">
                              Created by: {shareToken.createdBy}
                            </div>
                          )}
                          {shareToken.description && (
                            <div className="text-xs text-muted-foreground/70 mt-1">
                              {shareToken.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-foreground">
                              {shareToken.viewCount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              views
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(shareToken.createdAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground/70">
                              created
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {shareToken.isRevoked ? (
                            <Badge variant="secondary">Revoked</Badge>
                          ) : shareToken.isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge className="bg-success/20 text-success border-success/50">
                              Active
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Expires{" "}
                            {formatDistanceToNow(
                              new Date(shareToken.expiresAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyShareUrl(shareToken.shareUrl)}
                          >
                            Copy Link
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(shareToken.shareUrl, "_blank")
                            }
                          >
                            View
                          </Button>
                          {!shareToken.isRevoked && !shareToken.isExpired && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => revokeToken(shareToken.token)}
                              title={
                                isAdminView
                                  ? "Admin revoke (any user's token)"
                                  : "Revoke your token"
                              }
                            >
                              {isAdminView ? "Admin Revoke" : "Revoke"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
