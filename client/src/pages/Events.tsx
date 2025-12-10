import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Activity, UserPlus, CheckCircle, XCircle, Settings, Download, Search, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function Events() {
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'enrollment' | 'match' | 'no_match' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const { data: events, isLoading } = trpc.events.list.useQuery({
    eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
    limit: 1000, // Increased for export
  });

  const filteredEvents = events?.filter(event => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(query);
      const matchesDescription = event.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription) return false;
    }
    
    // Date range filter
    if (dateFrom) {
      const eventDate = new Date(event.createdAt);
      const fromDate = new Date(dateFrom);
      if (eventDate < fromDate) return false;
    }
    
    if (dateTo) {
      const eventDate = new Date(event.createdAt);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (eventDate > toDate) return false;
    }
    
    return true;
  });

  const exportToCSV = () => {
    if (!filteredEvents || filteredEvents.length === 0) {
      toast.error('No events to export');
      return;
    }

    // CSV headers
    const headers = ['ID', 'Date/Time', 'Event Type', 'Title', 'Description', 'Enrollee ID', 'User ID', 'Camera Source'];
    
    // CSV rows
    const rows = filteredEvents.map(event => [
      event.id,
      new Date(event.createdAt).toLocaleString(),
      event.eventType,
      event.title || '',
      event.description || '',
      event.enrolleeId || '',
      event.userId,
      event.cameraSource || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredEvents.length} events to CSV`);
  };

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail & Events</h1>
          <p className="text-muted-foreground mt-1">
            Complete history of all system activities and face recognition operations
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter events by type, date range, or search keywords</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Event Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={(value: any) => setEventTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="enrollment">Enrollment</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="no_match">No Match</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredEvents?.length || 0} of {events?.length || 0} events
          </div>
        </CardContent>
      </Card>

      {/* Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
          <CardDescription>Chronological list of all system activities</CardDescription>
        </CardHeader>
        <CardContent>
          {!filteredEvents || filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">{getEventIcon(event.eventType)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge className={getEventBadgeColor(event.eventType)}>
                        {event.eventType}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                      {event.cameraSource && <span>Camera: {event.cameraSource}</span>}
                      {event.enrolleeId && <span>Enrollee ID: {event.enrolleeId}</span>}
                    </div>
                  </div>
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt="Event snapshot"
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
