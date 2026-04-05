import React, { useMemo, useState } from 'react';
import { FiCheck, FiClipboard, FiFileText, FiPlay, FiSkipForward, FiUpload } from 'react-icons/fi';

const OPENSTAX_BOOKS = [
    'AlgebraTrigonometry2.pdf',
    'Calculus1.pdf',
    'Calculus2.pdf',
    'Calculus3.pdf',
    'CollegeAlgebra2.pdf',
    'IntermediateAlgebra2.pdf',
    'IntroductoryStatistics2.pdf',
    'Precalculus2.pdf'
];

const DEFAULTS = {
    book: OPENSTAX_BOOKS[0],
    startPage: 1,
    endPage: 20,
    pagesPerBatch: 2,
    maxChars: 12000,
    answerMode: 'exclude',
    answerPagesStart: '',
    pythonCmd: 'python'
};

const normalizePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeForPowerShell = (value) => String(value).replaceAll("'", "''");

const buildRunCommand = ({
    pythonCmd,
    book,
    startPage,
    endPage,
    pagesPerBatch,
    maxChars,
    answerMode,
    answerPagesStart
}) => {
    const commandParts = [
        pythonCmd,
        'extract_openstax_batches.py',
        '--book',
        `'${escapeForPowerShell(book)}'`,
        '--start-page',
        String(startPage),
        '--end-page',
        String(endPage),
        '--pages-per-batch',
        String(pagesPerBatch),
        '--max-chars',
        String(maxChars),
        '--answer-mode',
        answerMode,
        '--strict-math-guard'
    ];

    if (answerPagesStart) {
        commandParts.push('--answer-pages-start', String(answerPagesStart));
    }

    return [
        'cd backend/EquathoraBackend/books/BookExtract',
        commandParts.join(' ')
    ].join('; ');
};

const formatBatchLabel = (batch, idx) => {
    if (!batch) return '';
    return `Batch ${idx + 1} | pages ${batch.page_start}-${batch.page_end} | ${batch.char_count} chars`;
};

const readJsonFile = async (file) => {
    const text = await file.text();
    return JSON.parse(text);
};

const AdminSolutionGenerator = () => {
    const [config, setConfig] = useState(DEFAULTS);
    const [loadedFileName, setLoadedFileName] = useState('');
    const [loadedPayload, setLoadedPayload] = useState(null);
    const [batchIndex, setBatchIndex] = useState(0);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const batches = loadedPayload?.batches || [];
    const currentBatch = batches[batchIndex] || null;
    const canMoveNext = batchIndex < batches.length - 1;
    const canMovePrev = batchIndex > 0;

    const runCommand = useMemo(() => {
        return buildRunCommand({
            pythonCmd: config.pythonCmd || 'python',
            book: config.book,
            startPage: normalizePositiveInt(config.startPage, DEFAULTS.startPage),
            endPage: normalizePositiveInt(config.endPage, DEFAULTS.endPage),
            pagesPerBatch: normalizePositiveInt(config.pagesPerBatch, DEFAULTS.pagesPerBatch),
            maxChars: normalizePositiveInt(config.maxChars, DEFAULTS.maxChars),
            answerMode: config.answerMode,
            answerPagesStart: normalizePositiveInt(config.answerPagesStart, 0)
        });
    }, [config]);

    const setField = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const copyText = async (value, successMessage) => {
        try {
            await navigator.clipboard.writeText(value);
            setError('');
            setNotice(successMessage);
        } catch {
            setNotice('');
            setError('Clipboard copy failed. Copy manually from the text area.');
        }
    };

    const copyRunCommand = async () => {
        await copyText(runCommand, 'Run command copied. Paste in terminal and press Enter.');
    };

    const onLoadOutputFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parsed = await readJsonFile(file);
            if (!Array.isArray(parsed?.batches)) {
                throw new Error('Invalid file. Expected JSON with a batches array.');
            }

            setLoadedPayload(parsed);
            setLoadedFileName(file.name);
            setBatchIndex(0);
            setNotice(`Loaded ${parsed.batches.length} batch(es) from ${file.name}.`);
            setError('');
        } catch (fileError) {
            setLoadedPayload(null);
            setLoadedFileName('');
            setBatchIndex(0);
            setNotice('');
            setError(fileError?.message || 'Failed to read JSON output file.');
        }
    };

    const copyCurrentBatch = async () => {
        if (!currentBatch?.prompt_text) return;
        await copyText(currentBatch.prompt_text, `${formatBatchLabel(currentBatch, batchIndex)} copied.`);
    };

    const copyAndNext = async () => {
        if (!currentBatch?.prompt_text) return;

        try {
            await navigator.clipboard.writeText(currentBatch.prompt_text);
            if (canMoveNext) {
                setBatchIndex((prev) => prev + 1);
                setNotice(`${formatBatchLabel(currentBatch, batchIndex)} copied. Moved to next batch.`);
            } else {
                setNotice(`${formatBatchLabel(currentBatch, batchIndex)} copied. No more batches.`);
            }
            setError('');
        } catch {
            setNotice('');
            setError('Clipboard copy failed. Copy manually from the text area.');
        }
    };

    const clampedStart = normalizePositiveInt(config.startPage, DEFAULTS.startPage);
    const clampedEnd = normalizePositiveInt(config.endPage, DEFAULTS.endPage);
    const hasInvalidRange = clampedEnd < clampedStart;
    const charLimit = normalizePositiveInt(config.maxChars, DEFAULTS.maxChars);
    const isCharLimitTooLow = charLimit < 2000;

    return (
        <section className='flex flex-col gap-5 px-3 py-3 text-[var(--secondary-color)] md:px-5'>
            <header className='rounded-xl border p-5' style={{ borderColor: 'var(--mid-main-secondary)', background: 'linear-gradient(135deg, var(--main-color), var(--french-gray))' }}>
                <h1 className='text-2xl font-black md:text-3xl'>OpenStax Problem Extraction Workflow</h1>
                <p className='mt-2 text-sm md:text-base'>Pick a book and page range, run the generated Python command, then copy each batch with one click and move to the next instantly.</p>
            </header>

            <div className='grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-2' style={{ borderColor: 'var(--mid-main-secondary)', backgroundColor: 'var(--main-color)' }}>
                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Book (OpenStax)
                    <select
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.book}
                        onChange={(event) => setField('book', event.target.value)}
                    >
                        {OPENSTAX_BOOKS.map((book) => <option key={book} value={book}>{book}</option>)}
                    </select>
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Python Command
                    <input
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.pythonCmd}
                        onChange={(event) => setField('pythonCmd', event.target.value)}
                        placeholder='python'
                    />
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Start Page
                    <input
                        type='number'
                        min='1'
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.startPage}
                        onChange={(event) => setField('startPage', event.target.value)}
                    />
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    End Page
                    <input
                        type='number'
                        min='1'
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.endPage}
                        onChange={(event) => setField('endPage', event.target.value)}
                    />
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Pages Per Batch
                    <input
                        type='number'
                        min='1'
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.pagesPerBatch}
                        onChange={(event) => setField('pagesPerBatch', event.target.value)}
                    />
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Max Characters Per Batch
                    <input
                        type='number'
                        min='2000'
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.maxChars}
                        onChange={(event) => setField('maxChars', event.target.value)}
                    />
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Answer Handling
                    <select
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.answerMode}
                        onChange={(event) => setField('answerMode', event.target.value)}
                    >
                        <option value='exclude'>Exclude answer pages</option>
                        <option value='separate'>Generate separate answer batches</option>
                        <option value='include'>Include answer pages in questions</option>
                    </select>
                </label>

                <label className='flex flex-col gap-1 text-sm font-semibold'>
                    Answer Pages Start (optional)
                    <input
                        type='number'
                        min='1'
                        className='rounded-md border bg-[var(--french-gray)] px-3 py-2 text-sm'
                        style={{ borderColor: 'var(--mid-main-secondary)' }}
                        value={config.answerPagesStart}
                        onChange={(event) => setField('answerPagesStart', event.target.value)}
                        placeholder='e.g. 901'
                    />
                </label>
            </div>

            <div className='rounded-xl border p-4' style={{ borderColor: 'var(--mid-main-secondary)', backgroundColor: 'var(--main-color)' }}>
                <div className='flex flex-wrap items-center gap-2'>
                    <button
                        type='button'
                        onClick={copyRunCommand}
                        disabled={hasInvalidRange || isCharLimitTooLow}
                        className='inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[var(--main-color)] disabled:opacity-70'
                        style={{ background: 'linear-gradient(360deg,var(--accent-color),var(--dark-accent-color))' }}
                    >
                        <FiPlay />
                        Copy Run Command
                    </button>
                    <label className='inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold' style={{ borderColor: 'var(--mid-main-secondary)' }}>
                        <FiUpload />
                        Load Generated JSON
                        <input type='file' accept='.json,application/json' onChange={onLoadOutputFile} className='hidden' />
                    </label>
                </div>

                <textarea
                    readOnly
                    value={runCommand}
                    className='mt-3 min-h-24 w-full rounded-md border bg-[var(--french-gray)] p-3 text-xs md:text-sm'
                    style={{ borderColor: 'var(--mid-main-secondary)' }}
                />

                {hasInvalidRange && <p className='mt-2 text-sm font-semibold text-[var(--accent-color)]'>End page must be greater than or equal to start page.</p>}
                {isCharLimitTooLow && <p className='mt-2 text-sm font-semibold text-[var(--accent-color)]'>Character limit should be at least 2000.</p>}
                {!hasInvalidRange && !isCharLimitTooLow && <p className='mt-2 text-xs text-[var(--mid-main-secondary)]'>This command runs locally in terminal. Browser security prevents directly launching Python from this page.</p>}
            </div>

            <div className='rounded-xl border p-4' style={{ borderColor: 'var(--mid-main-secondary)', backgroundColor: 'var(--main-color)' }}>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                    <h2 className='text-lg font-bold'>Copy Queue</h2>
                    <p className='text-xs text-[var(--mid-main-secondary)]'>
                        {loadedFileName ? `${loadedFileName} | ${batches.length} batch(es)` : 'Load a generated JSON file to start'}
                    </p>
                </div>

                {currentBatch ? (
                    <>
                        <div className='mt-3 flex flex-wrap items-center gap-2'>
                            <button
                                type='button'
                                onClick={copyCurrentBatch}
                                className='inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold'
                                style={{ borderColor: 'var(--mid-main-secondary)' }}
                            >
                                <FiClipboard />
                                Copy Current
                            </button>

                            <button
                                type='button'
                                onClick={copyAndNext}
                                className='inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[var(--main-color)]'
                                style={{ background: 'linear-gradient(360deg,var(--accent-color),var(--dark-accent-color))' }}
                            >
                                <FiSkipForward />
                                Copy + Next
                            </button>

                            <button
                                type='button'
                                onClick={() => canMovePrev && setBatchIndex((prev) => prev - 1)}
                                disabled={!canMovePrev}
                                className='rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-60'
                                style={{ borderColor: 'var(--mid-main-secondary)' }}
                            >
                                Prev
                            </button>

                            <button
                                type='button'
                                onClick={() => canMoveNext && setBatchIndex((prev) => prev + 1)}
                                disabled={!canMoveNext}
                                className='rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-60'
                                style={{ borderColor: 'var(--mid-main-secondary)' }}
                            >
                                Next
                            </button>
                        </div>

                        <p className='mt-3 text-sm font-semibold'>
                            <FiFileText className='mr-1 inline-block align-[-2px]' />
                            {formatBatchLabel(currentBatch, batchIndex)}
                        </p>

                        <textarea
                            readOnly
                            value={currentBatch.prompt_text}
                            className='mt-3 min-h-72 w-full rounded-md border bg-[var(--french-gray)] p-3 text-xs md:text-sm'
                            style={{ borderColor: 'var(--mid-main-secondary)' }}
                        />
                    </>
                ) : (
                    <p className='mt-3 text-sm text-[var(--mid-main-secondary)]'>No queue loaded yet.</p>
                )}

                {!!notice && (
                    <p className='mt-3 text-sm font-semibold text-[var(--secondary-color)]'>
                        <FiCheck className='mr-1 inline-block align-[-2px]' />
                        {notice}
                    </p>
                )}

                {!!error && <p className='mt-3 text-sm font-semibold text-[var(--accent-color)]'>{error}</p>}
            </div>
        </section>
    );
};

export default AdminSolutionGenerator;