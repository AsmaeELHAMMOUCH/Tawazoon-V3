import axios from 'axios';

const API_BASE_URL = '/api'; // Adjust if needed

export const api = axios.create({
    baseURL: API_BASE_URL
});

export const simulateCNDP = async (payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/cndp/simulate`, payload);
        return response.data;
    } catch (error) {
        console.error("API Call Error:", error);
        throw error;
    }
};

export const simulateBandoeng = async (payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/bandoeng/simulate`, payload);
        return response.data;
    } catch (error) {
        console.error("API Call Error (Bandoeng):", error);
        throw error;
    }
}

export const simulateBandoengDirect = async (payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/bandoeng/simulate-bandoeng`, payload);
        return response.data;
    } catch (error) {
        console.error("API Call Error (Bandoeng Direct):", error);
        throw error;
    }
}

export const downloadBandoengTemplate = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/export/bandoeng/template`, {
            responseType: 'blob', // Important for file download
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Modele_Import_Volumes_Bandoeng.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();

    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importBandoengVolumes = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/bandoeng/import/volume-grid`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};

export const downloadBandoengTasksTemplate = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/bandoeng/import-template`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Modele_Mise_a_jour_Taches.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();

    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importBandoengTasks = async (file, centreId) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/bandoeng/import/tasks?centre_id=${centreId}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            responseType: 'blob',
        });

        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            const text = await response.data.text();
            return JSON.parse(text);
        }

        return {
            isErrorFile: true,
            data: response.data,
            errorCount: response.headers['x-error-count'],
            updatedCount: response.headers['x-updated-count']
        };
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};

export const downloadNewTasksTemplate = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/bandoeng/new-tasks-template`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Modele_Nouvelles_Taches.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importNewTasks = async (file, centreId) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/bandoeng/import-new-tasks?centre_id=${centreId}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            responseType: 'blob',
        });

        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            const text = await response.data.text();
            return JSON.parse(text);
        }

        return {
            isErrorFile: true,
            data: response.data,
            errorCount: response.headers['x-error-count'],
            createdCount: response.headers['x-created-count']
        };
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};

export const fetchCentres = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/centres/`);
        return response.data;
    } catch (error) {
        console.error("Fetch Centres Error:", error);
        throw error;
    }
};

export const downloadApsTemplate = async (regionId, typologieId) => {
    try {
        let url = `${API_BASE_URL}/pm/aps/export-template`;
        const params = [];
        if (regionId) params.push(`region_id=${regionId}`);
        if (typologieId) params.push(`typologie_id=${typologieId}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const response = await axios.get(url, {
            responseType: 'blob',
        });

        const contentDisposition = response.headers['content-disposition'];
        let filename = 'template_aps.xlsx';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename=(.+)/);
            if (filenameMatch.length > 1) filename = filenameMatch[1];
        }

        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importAps = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/pm/aps/import`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            responseType: 'blob',
        });

        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            const text = await response.data.text();
            return JSON.parse(text);
        }

        return {
            isErrorFile: true,
            data: response.data,
            errorCount: response.headers['x-error-count'],
            updatedCount: response.headers['x-updated-count']
        };
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};

export const updateCentreAps = async (centreId, aps) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/pm/centres/${centreId}/aps`, { aps });
        return response.data;
    } catch (error) {
        console.error("Update APS Error:", error);
        throw error;
    }
};

export const downloadEffectifsTemplate = async (regionId, typologieId, centreId) => {
    try {
        let url = `${API_BASE_URL}/pm/effectifs/export-template`;
        const params = [];
        if (regionId) params.push(`region_id=${regionId}`);
        if (typologieId) params.push(`typologie_id=${typologieId}`);
        if (centreId) params.push(`centre_id=${centreId}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const response = await axios.get(url, {
            responseType: 'blob',
        });

        const contentDisposition = response.headers['content-disposition'];
        let filename = 'template_effectifs.xlsx';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename=(.+)/);
            if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
        }

        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importEffectifs = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/pm/effectifs/import`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            responseType: 'blob', // Important since the server might return an Excel file of errors
        });

        // If successful, the server returns JSON despite expecting a blob, so we must manually parse it
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            const text = await response.data.text();
            return JSON.parse(text);
        }

        // If the server returns a blob, it means there are rejected rows
        return {
            isErrorFile: true,
            data: response.data,
            errorCount: response.headers['x-error-count'],
            updatedCount: response.headers['x-updated-count'],
            createdCount: response.headers['x-created-count']
        };
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};

export const clearEffectifs = async (regionId, typologieId, centreId) => {
    try {
        let url = `${API_BASE_URL}/pm/effectifs/clear`;
        const params = [];
        if (regionId) params.push(`region_id=${regionId}`);
        if (typologieId) params.push(`typologie_id=${typologieId}`);
        if (centreId) params.push(`centre_id=${centreId}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const response = await axios.delete(url);
        return response.data;
    } catch (error) {
        console.error("Clear Effectifs Error:", error);
        throw error;
    }
};
