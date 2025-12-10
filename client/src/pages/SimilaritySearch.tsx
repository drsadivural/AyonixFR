import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Search, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SimilaritySearch() {
  const [selectedEnrolleeId, setSelectedEnrolleeId] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.85);
  
  const { data: enrollees, isLoading: enrolleesLoading } = trpc.enrollees.list.useQuery();
  const { data: similarFaces, isLoading: searchLoading, refetch } = trpc.similarity.findSimilar.useQuery(
    { enrolleeId: selectedEnrolleeId!, threshold },
    { enabled: selectedEnrolleeId !== null }
  );
  
  const handleSearch = () => {
    if (!selectedEnrolleeId) {
      toast.error("Please select an enrollee first");
      return;
    }
    refetch();
  };
  
  const selectedEnrollee = enrollees?.find(e => e.id === selectedEnrolleeId);
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Face Similarity Search</h1>
        <p className="text-muted-foreground mt-2">
          Find similar faces in the database and detect potential duplicates
        </p>
      </div>
      
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
          <CardDescription>Select an enrollee and adjust the similarity threshold</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="enrollee-select">Select Enrollee</Label>
            <Select
              value={selectedEnrolleeId?.toString() || ""}
              onValueChange={(value) => setSelectedEnrolleeId(parseInt(value))}
            >
              <SelectTrigger id="enrollee-select">
                <SelectValue placeholder="Choose an enrollee..." />
              </SelectTrigger>
              <SelectContent>
                {enrollees?.map((enrollee) => (
                  <SelectItem key={enrollee.id} value={enrollee.id.toString()}>
                    {enrollee.name} {enrollee.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Similarity Threshold: {(threshold * 100).toFixed(0)}%</Label>
            <Slider
              value={[threshold]}
              onValueChange={(values) => setThreshold(values[0])}
              min={0.5}
              max={1.0}
              step={0.05}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Higher threshold = more strict matching (fewer results)
            </p>
          </div>
          
          <Button 
            onClick={handleSearch} 
            disabled={!selectedEnrolleeId || searchLoading}
            className="w-full"
          >
            <Search className="mr-2 h-4 w-4" />
            {searchLoading ? "Searching..." : "Find Similar Faces"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Selected Enrollee */}
      {selectedEnrollee && (
        <Card>
          <CardHeader>
            <CardTitle>Reference Face</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {selectedEnrollee.thumbnailUrl ? (
                <img
                  src={selectedEnrollee.thumbnailUrl}
                  alt={`${selectedEnrollee.name} ${selectedEnrollee.surname}`}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedEnrollee.name} {selectedEnrollee.surname}
                </h3>
                {selectedEnrollee.email && (
                  <p className="text-sm text-muted-foreground">{selectedEnrollee.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Similar Faces Results */}
      {similarFaces && similarFaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Similar Faces Found ({similarFaces.length})
            </CardTitle>
            <CardDescription>
              These faces have a similarity score above {(threshold * 100).toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarFaces.map((face: any) => (
                <Card key={face.id} className="overflow-hidden">
                  <div className="relative">
                    {face.thumbnailUrl ? (
                      <img
                        src={face.thumbnailUrl}
                        alt={`${face.name} ${face.surname}`}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <User className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                      {(face.similarity * 100).toFixed(1)}%
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold">{face.name} {face.surname}</h3>
                    {face.email && (
                      <p className="text-sm text-muted-foreground">{face.email}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${face.similarity * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {similarFaces && similarFaces.length === 0 && selectedEnrolleeId && !searchLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Similar Faces Found</h3>
            <p className="text-muted-foreground">
              No faces match the similarity threshold of {(threshold * 100).toFixed(0)}%.
              Try lowering the threshold to see more results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
