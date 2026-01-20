import useSWR from 'swr';
import { endpoints } from '@/utils/api';

interface Bed {
    id: string;
    status: string;
    is_occupied: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const useBedOccupancy = () => {
    const { data: beds, error } = useSWR<Bed[]>(endpoints.beds, fetcher, {
        refreshInterval: 5000
    });

    if (!beds || error) {
        return {
            percentage: 0,
            isFull: false,
            loading: !beds && !error
        };
    }

    const total = beds.length;
    // Assuming status 'OCCUPIED' or is_occupied flag. Based on AdminPanel code: b.status === "OCCUPIED" 
    const occupied = beds.filter(b => b.status === "OCCUPIED" || b.status === "DIRTY" || b.status === "CLEANING").length; // Should we count DIRTY/CLEANING as occupied? 
    // Usually availability implies READY beds. So Occupied = Total - Available.
    // Available = Status === "AVAILABLE".

    // User says "bed_occupancy === 100".
    // If NO beds are available (AVAILABLE count is 0), then we are full.

    const available = beds.filter(b => b.status === "AVAILABLE").length;
    const realOccupied = total - available;
    const percentage = total > 0 ? Math.round((realOccupied / total) * 100) : 0;

    return {
        percentage,
        isFull: available === 0, // 100% capacity if no available beds
        loading: false,
        total,
        available
    };
};
