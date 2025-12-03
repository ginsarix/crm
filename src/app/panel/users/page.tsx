import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function UsersPage() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6">
          <h2 className="font-bold text-3xl tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage system users and permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              User management interface coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
