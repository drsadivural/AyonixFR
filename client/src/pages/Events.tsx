import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Activity, UserPlus, CheckCircle, XCircle, Settings } from "lucide-react";

export default function Events() {
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'enrollment' | 'match' | 'no_match' | 'system'>('all');
  
  const { data: events, isLoading } = trpc.events.list.useQuery({
    eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
    limit: 100,
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'match':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'no_match':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'enrollment':
        return 'bg-blue-100 text-blue-700';
      case 'match':
        return 'bg-green-100 text-green-700';
      case 'no_match':
        return 'bg-red-100 text-red-700';
      case 'system':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Events</h1>
          <p className="text-muted-foreground mt-2">
            Activity log and recognition history
          </p>
        </div>
        <Select value={eventTypeFilter} onValueChange={(v: any) => setEventTypeFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="enrollment">Enrollments</SelectItem>
            <SelectItem value="match">Matches</SelectItem>
            <SelectItem value="no_match">No Matches</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
          <CardDescription>Chronological list of system activities</CardDescription>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 border-b pb-4 last:border-0 animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.eventType)}
                  </div>

                  {/* Image */}
                  {event.imageUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getEventBadgeColor(event.eventType)}>
                        {event.eventType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                      {event.cameraSource && (
                        <span className="text-xs text-muted-foreground">
                          • {event.cameraSource}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mt-1">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No events found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {eventTypeFilter === 'all'
                  ? 'Start enrolling and verifying faces to see activity here'
                  : `No ${eventTypeFilter} events found`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
